import { describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import type { LlmHubSettings } from "../types";
import { EventEmitter } from "../utils/EventEmitter";
import { WorkspaceStateManager } from "./workspaceStateManager";

function createManager(initialContent: string) {
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
    () => ({ workspaceFolder: "LLMHub", apiProviders: [], cliConfig: {} } as unknown as LlmHubSettings),
    async () => undefined,
    emitter,
    async () => ({}),
  );
  return { manager, emitter, write, getContent: () => content };
}

describe("WorkspaceStateManager combined search persistence", () => {
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
