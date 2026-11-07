import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MarkdownView, TFile } from "obsidian";
import type { App } from "obsidian";
import { DEFAULT_SETTINGS, DEFAULT_RAG_SETTING, DEFAULT_GEMINI_EMBEDDING_MODEL, type ApiProviderConfig } from "src/types";
import { createLiveVaultToolRunner, getLiveRagApiKey, liveTranscriptMessages } from "./live-vault-tools";
import { LiveToolDispatcher, liveToolDefinitions, liveToolInstructions } from "./live-tool-definitions";

const { execute, makeExecutor, searchRag } = vi.hoisted(() => ({ execute: vi.fn(), makeExecutor: vi.fn(), searchRag: vi.fn() }));
vi.mock("src/vault/toolExecutor", () => ({ createToolExecutor: makeExecutor }));
vi.mock("../localRagStore", () => ({ searchLocalRagResults: searchRag }));
vi.mock("obsidian", async original => ({ ...await original<object>(), MarkdownView: class { file: unknown; editor: unknown; } }));
beforeEach(() => { vi.resetAllMocks(); makeExecutor.mockReturnValue(execute); });
afterEach(() => vi.useRealTimers());

function fixture(path: string) {
  const file = new TFile(); file.path = path;
  const view = new MarkdownView();
  Object.assign(view, { file, editor: { getValue: () => "unsaved editor text" } });
  const app = { workspace: { getMostRecentLeaf: () => ({ view }), getActiveFile: () => file } } as unknown as App;
  const settings = { ...DEFAULT_SETTINGS, cloudVaultToolAllowedFolders: ["Shared"] };
  return { app, settings, run: createLiveVaultToolRunner(app, settings, { fileAccess: true }) };
}

describe("Live vault access", () => {
  it("reads unsaved text from an allowed editor file without writing it", async () => {
    const f = fixture("Shared/note.md");
    expect(await f.run({ id: "1", name: "read_current_file", args: {} }, new AbortController().signal)).toMatchObject({ filePath: "Shared/note.md", content: "unsaved editor text", unsavedEditorText: true });
    expect(execute).not.toHaveBeenCalled();
  });
  it("does not expose the active editor text outside allowed folders", async () => {
    const f = fixture("Private/secret.md");
    const result = await f.run({ id: "1", name: "read_current_file", args: {} }, new AbortController().signal);
    expect(JSON.stringify(result)).toContain("Access denied");
    expect(JSON.stringify(result)).not.toContain("unsaved editor text");
    expect(execute).not.toHaveBeenCalled();
  });
  it("passes folder restrictions and text-only PDF handling to shared vault tools", async () => {
    const f = fixture("Shared/note.md");
    expect(makeExecutor).toHaveBeenCalledWith(f.app, expect.objectContaining({ limitVaultToolScope: true, vaultToolAllowedFolders: ["Shared"], pdfInputMode: "extract-text" }));
  });
  it("rejects mutations and calls when file access is disabled", async () => {
    const f = fixture("Shared/note.md");
    const call = { id: "1", name: "create_note", args: { fileName: "Shared/new.md" } };
    expect(await f.run(call, new AbortController().signal)).toEqual({ error: "This tool is unavailable in Live." });
    const disabled = createLiveVaultToolRunner(f.app, f.settings, { fileAccess: false });
    expect(await disabled({ ...call, name: "read_note" }, new AbortController().signal)).toHaveProperty("error");
    expect(execute).not.toHaveBeenCalled();
  });
  it("preserves transcript order and omits empty audio turns", () => {
    expect(liveTranscriptMessages([
      { id: "1", role: "user", text: "Hello" }, { id: "2", role: "assistant", text: " " }, { id: "3", role: "assistant", text: "Hi" },
    ], 100)).toEqual([{ role: "user", content: "Hello", timestamp: 100 }, { role: "assistant", content: "Hi", timestamp: 101 }]);
  });
});

describe("Live RAG embedding credentials", () => {
  function provider(type: "gemini" | "openai", enabled: boolean): ApiProviderConfig {
    return {
      id: type, name: type, type, enabled, verified: false, enabledModels: [], availableModels: [],
      baseUrl: type === "gemini" ? "https://generativelanguage.googleapis.com" : "https://api.openai.com",
      apiKey: `${type}-key`,
    };
  }
  function ragFixture(includeGemini = true) {
    const f = fixture("Shared/note.md");
    const settings = { ...f.settings, apiProviders: [provider("openai", true), ...(includeGemini ? [provider("gemini", false)] : [])] };
    const setting = { ...DEFAULT_RAG_SETTING, embeddingModel: DEFAULT_GEMINI_EMBEDDING_MODEL };
    return { ...f, settings, setting, runRag: (override = setting) => createLiveVaultToolRunner(f.app, settings, { fileAccess: true, ragEnabled: true }, { name: "Notes", setting: override })({ id: "rag-1", name: "rag_search", args: { query: "Launch date" } }, new AbortController().signal) };
  }

  it("uses the registered Gemini key for Embedding 2 while Live uses OpenAI", async () => {
    const f = ragFixture(); searchRag.mockResolvedValue([]);
    expect(await f.runRag()).toEqual({ query: "Launch date", resultCount: 0, results: [] });
    expect(searchRag.mock.calls[0][3]).toBe("gemini-key");
    expect(searchRag.mock.calls[0][2].embeddingModel).toBe(DEFAULT_GEMINI_EMBEDDING_MODEL);
    expect(searchRag.mock.calls[0][3]).not.toBe("openai-key");
  });
  it("searches the selected RAG index while blocking direct Vault tools when file access is off", async () => {
    const f = ragFixture();
    searchRag.mockResolvedValue([{ filePath: "Shared/note.md", text: "Friday", score: 1 }]);
    const runner = createLiveVaultToolRunner(f.app, f.settings, { fileAccess: false, ragEnabled: true }, { name: "Notes", setting: f.setting });
    const dispatcher = new LiveToolDispatcher({ fileAccess: false, ragEnabled: true }, runner);
    expect(await dispatcher.run({ id: "rag-only", name: "rag_search", args: { query: "Launch date" } })).toMatchObject({ resultCount: 1, results: [{ filePath: "Shared/note.md", text: "Friday" }] });
    expect(searchRag).toHaveBeenCalledTimes(1);
    for (const name of ["read_current_file", "read_note", "search_notes", "list_notes", "list_folders", "get_active_note_info"]) {
      const call = { id: name, name, args: {} };
      expect(await dispatcher.run(call)).toHaveProperty("error", "This tool is unavailable in Live.");
      expect(await runner(call, new AbortController().signal)).toHaveProperty("error", "This tool is unavailable in Live.");
    }
    expect(execute).not.toHaveBeenCalled();
  });
  it("prioritizes the index-specific embedding key", () => {
    const f = ragFixture();
    expect(getLiveRagApiKey({ ...f.setting, embeddingApiKey: "index-key" }, f.settings)).toBe("index-key");
  });
  it("does not report an empty successful search as an authentication failure", async () => {
    const f = ragFixture(); searchRag.mockResolvedValue([]);
    const result = await f.runRag();
    expect(result).not.toHaveProperty("error");
    expect(result).toHaveProperty("resultCount", 0);
  });
  it("reports a missing Gemini credential explicitly without reusing the OpenAI key", async () => {
    const f = ragFixture(false);
    expect(await f.runRag()).toHaveProperty("error", expect.stringContaining("Gemini API key"));
    expect(searchRag).not.toHaveBeenCalled();
  });
  it("returns the actual HTTP failure with API keys redacted", async () => {
    const f = ragFixture(); searchRag.mockRejectedValue(new Error("Embedding API error: 401 invalid gemini-key"));
    const result = await f.runRag();
    expect(result).toHaveProperty("error", "Embedding API error: 401 invalid [redacted]");
    expect(JSON.stringify(result)).not.toContain("gemini-key");
  });
  it("does not send a registered Gemini key to an unrelated embedding endpoint", () => {
    const f = ragFixture();
    expect(getLiveRagApiKey({ ...f.setting, embeddingBaseUrl: "https://other.example.com" }, f.settings)).toBe("");
    expect(getLiveRagApiKey({ ...f.setting, embeddingBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" }, f.settings)).toBe("gemini-key");
  });
  it("preserves search counts when a large response is truncated for the voice model", async () => {
    const f = ragFixture(); searchRag.mockResolvedValue([{ filePath: "Shared/large.md", text: "a".repeat(50_000), score: 1 }]);
    expect(await f.runRag()).toMatchObject({ truncated: true, resultCount: 1 });
  });
});

describe("Live tool dispatch", () => {
  it("only advertises read tools, with optional RAG", () => {
    expect(liveToolDefinitions({ fileAccess: false, ragEnabled: false })).toEqual([]);
    expect(liveToolDefinitions({ fileAccess: false, ragEnabled: true }).map(tool => tool.name)).toEqual(["rag_search"]);
    expect(liveToolDefinitions({ fileAccess: true, ragEnabled: false }).map(tool => tool.name)).not.toContain("rag_search");
    const names = liveToolDefinitions({ fileAccess: true, ragEnabled: true }).map(tool => tool.name);
    expect(names).toContain("rag_search");
    expect(names).not.toContain("create_note");
    expect(names).not.toContain("execute_javascript");
  });
  it("describes only the enabled sources in the Live instructions", () => {
    expect(liveToolInstructions({})).toBe("");
    const ragOnly = liveToolInstructions({ fileAccess: false, ragEnabled: true });
    expect(ragOnly).toContain("Direct Vault file access is disabled");
    expect(ragOnly).toContain("rag_search");
    expect(ragOnly).not.toContain("read_current_file");
    const filesOnly = liveToolInstructions({ fileAccess: true, ragEnabled: false });
    expect(filesOnly).toContain("read_current_file");
    expect(filesOnly).not.toContain("rag_search");
  });
  it("deduplicates repeated calls and aborts pending execution on stop", async () => {
    const executeTool = vi.fn((_call, signal: AbortSignal) => new Promise(resolve => signal.addEventListener("abort", () => resolve({ late: true }))));
    const dispatcher = new LiveToolDispatcher({ fileAccess: true }, executeTool);
    const call = { id: "read-1", name: "read_note", args: {} };
    const result = dispatcher.run(call);
    expect(dispatcher.run(call)).toBe(result);
    await Promise.resolve();
    dispatcher.cancel();
    expect(await result).toHaveProperty("error");
    expect(executeTool).toHaveBeenCalledTimes(1);
    expect(dispatcher.isCancelled(call.id)).toBe(true);
  });
  it("times out a stalled read without leaving the conversation blocked", async () => {
    vi.useFakeTimers();
    const dispatcher = new LiveToolDispatcher({ fileAccess: true }, () => new Promise(() => {}));
    const result = dispatcher.run({ id: "stall", name: "read_note", args: {} });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await result).toHaveProperty("error");
  });
});
