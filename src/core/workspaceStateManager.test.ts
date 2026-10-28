import { describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { DEFAULT_SETTINGS, DEFAULT_RAG_SETTING, type LlmHubSettings } from "../types";
import { EventEmitter } from "../utils/EventEmitter";
import { WorkspaceStateManager } from "./workspaceStateManager";

function createManager(initialContent: string, overrides: Partial<LlmHubSettings> = {}) {
  let content = initialContent;
  const write = vi.fn(async (_path: string, value: string) => { content = value; });
  const adapter = {
    exists: vi.fn(async (path: string) => path === "LLMHub/gemini-workspace.json" || path === "LLMHub"),
    read: vi.fn(async () => content),
    write,
    mkdir: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
  const emitter = new EventEmitter();
  const manager = new WorkspaceStateManager(
    { vault: { adapter } } as unknown as App,
    () => ({ ...DEFAULT_SETTINGS, workspaceFolder: "LLMHub", ...overrides }),
    emitter,
    async () => ({}),
  );
  return { manager, emitter, write, adapter, getContent: () => content };
}

describe("WorkspaceStateManager combined search persistence", () => {
  it.each([
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-2.5-flash",
  ])("migrates superseded Gemini Flash model %s", async (legacyModel) => {
    const harness = createManager(JSON.stringify({
      selectedModel: `api:gemini:${legacyModel}`,
      ragSettings: {},
    }));

    await harness.manager.loadWorkspaceState();

    expect(harness.manager.workspaceState.selectedModel).toBe("api:gemini:gemini-3.8-flash");
  });

  it("migrates retired Gemini 2.5 Pro", async () => {
    const harness = createManager(JSON.stringify({
      selectedModel: "api:gemini:gemini-2.5-pro",
      ragSettings: {},
    }));

    await harness.manager.loadWorkspaceState();

    expect(harness.manager.workspaceState.selectedModel).toBe("api:gemini:gemini-3.1-pro-preview");
  });

  it.each([
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
  ])("migrates deprecated Gemini Flash Lite model %s", async (legacyModel) => {
    const harness = createManager(JSON.stringify({
      selectedModel: `api:gemini:${legacyModel}`,
      ragSettings: {},
    }));

    await harness.manager.loadWorkspaceState();

    expect(harness.manager.workspaceState.selectedModel).toBe("api:gemini:gemini-3.5-flash-lite");
  });

  it("migrates and rewrites the legacy Web-only sentinel", async () => {
    const harness = createManager(JSON.stringify({
      selectedRagSetting: "__websearch__",
      ragSettings: {},
    }));

    await harness.manager.loadWorkspaceState();

    expect(harness.manager.workspaceState.selectedRagSetting).toBeNull();
    expect(harness.manager.workspaceState.webSearchEnabled).toBe(true);
    expect(harness.write).toHaveBeenCalledOnce();
    expect(JSON.parse(harness.getContent())).toMatchObject({
      selectedRagSetting: null,
      webSearchEnabled: true,
    });
  });

  it("saves Web and RAG atomically and emits the combined selection", async () => {
    const harness = createManager(JSON.stringify({ ragSettings: {} }));
    const listener = vi.fn();
    harness.emitter.on("search-selection-changed", listener);

    await harness.manager.loadWorkspaceState();
    await harness.manager.selectSearchSelection({ webSearch: true, ragSetting: "Research" });

    expect(JSON.parse(harness.getContent())).toMatchObject({
      selectedRagSetting: "Research",
      webSearchEnabled: true,
    });
    expect(listener).toHaveBeenCalledWith({ webSearch: true, ragSetting: "Research" });
  });
});

describe("WorkspaceStateManager per-index Jev filtering", () => {
  it.each([true, false])("persists the legacy global value %s on existing indexes once", async (enabled) => {
    const { jevRagFilterEnabled: _unused, ...legacy } = DEFAULT_RAG_SETTING;
    const harness = createManager(JSON.stringify({ ragSettings: { Notes: legacy, PDFs: legacy } }),
      { jevRagFilterEnabled: enabled });
    await harness.manager.loadWorkspaceState();
    expect(harness.manager.workspaceState.ragSettings.Notes.jevRagFilterEnabled).toBe(enabled);
    expect(harness.manager.workspaceState.ragSettings.PDFs.jevRagFilterEnabled).toBe(enabled);
    expect(harness.write).toHaveBeenCalledOnce();

    // Reload with the opposite legacy flag: persisted per-index values win.
    const reloaded = createManager(harness.getContent(), { jevRagFilterEnabled: !enabled });
    await reloaded.manager.loadWorkspaceState();
    expect(reloaded.manager.workspaceState.ragSettings.Notes.jevRagFilterEnabled).toBe(enabled);
    expect(reloaded.write).not.toHaveBeenCalled();
  });

  it("preserves independent choices and defaults new indexes to ON", async () => {
    const harness = createManager(JSON.stringify({ ragSettings: {
      Notes: DEFAULT_RAG_SETTING,
      PDFs: { ...DEFAULT_RAG_SETTING, jevRagFilterEnabled: false },
    } }));
    await harness.manager.loadWorkspaceState();
    await harness.manager.createRagSetting("New");
    expect(harness.manager.getRagSetting("Notes")?.jevRagFilterEnabled).toBe(true);
    expect(harness.manager.getRagSetting("PDFs")?.jevRagFilterEnabled).toBe(false);
    expect(harness.manager.getRagSetting("New")?.jevRagFilterEnabled).toBe(true);

    const onFilterChanged = vi.fn();
    const onSettingsChanged = vi.fn();
    harness.emitter.on("rag-filter-changed", onFilterChanged);
    harness.emitter.on("settings-updated", onSettingsChanged);
    await harness.manager.updateRagSetting("Notes", { jevRagFilterEnabled: false });
    expect(onFilterChanged).toHaveBeenCalledExactlyOnceWith("Notes");
    // Global settings changes restart CLI sessions; a filter toggle must not.
    expect(onSettingsChanged).not.toHaveBeenCalled();
    await harness.manager.loadWorkspaceState();
    expect(harness.manager.getRagSetting("Notes")?.jevRagFilterEnabled).toBe(false);
    expect(harness.manager.getRagSetting("New")?.jevRagFilterEnabled).toBe(true);
  });
});

describe("WorkspaceStateManager RAG setting names and their index", () => {
  const setting = (overrides: Record<string, unknown> = {}) => ({
    embeddingBaseUrl: "", embeddingApiKey: "", embeddingModel: "", chunkSize: 500, chunkOverlap: 100,
    pdfChunkPages: 6, topK: 5, scoreThreshold: 0.3, targetFolders: [], excludePatterns: [],
    searchFileExtensions: [], lastFullSync: null, externalIndexPath: "", sourceRagSettings: [],
    indexMultimodal: false, ...overrides,
  });

  it("refuses a name whose index directory an existing setting already owns", async () => {
    // Both reduce to "My_Index": one directory, two settings writing vectors to it.
    const harness = createManager(JSON.stringify({ ragSettings: { "My Index": setting() } }));
    await harness.manager.loadWorkspaceState();

    await expect(harness.manager.createRagSetting("My/Index")).rejects.toThrow(/conflicts/);
    await expect(harness.manager.renameRagSetting("My Index", "My.Index")).resolves.toBeUndefined();
  });

  it("moves the index with the setting when it is renamed", async () => {
    const harness = createManager(JSON.stringify({
      selectedRagSetting: "Old",
      ragSettings: { Old: setting(), Bundle: setting({ sourceRagSettings: ["Old"] }) },
    }));
    await harness.manager.loadWorkspaceState();

    await harness.manager.renameRagSetting("Old", "New");

    // The rename reads the old index before writing the new one; leaving it
    // behind meant the renamed setting re-embedded the whole vault.
    expect(harness.adapter.exists).toHaveBeenCalledWith("LLMHub/rag/Old/index.json");
    expect(harness.manager.workspaceState.ragSettings.Bundle.sourceRagSettings).toEqual(["New"]);
    expect(harness.manager.workspaceState.selectedRagSetting).toBe("New");
  });

  it("removes the index when the setting is deleted", async () => {
    const harness = createManager(JSON.stringify({
      selectedRagSetting: "Gone",
      ragSettings: { Gone: setting(), Bundle: setting({ sourceRagSettings: ["Gone", "Kept"] }), Kept: setting() },
    }));
    await harness.manager.loadWorkspaceState();

    await harness.manager.deleteRagSetting("Gone");

    expect(harness.adapter.exists).toHaveBeenCalledWith("LLMHub/rag/Gone/index.json");
    expect(harness.manager.workspaceState.ragSettings.Gone).toBeUndefined();
    expect(harness.manager.workspaceState.ragSettings.Bundle.sourceRagSettings).toEqual(["Kept"]);
    expect(harness.manager.workspaceState.selectedRagSetting).toBeNull();
  });
});
