import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { TFile, type App } from "obsidian";
import { ChunkBm25Index } from "obsidian-llm-hub-common/core";
import { DEFAULT_RAG_SETTING, DEFAULT_SETTINGS, type RagSetting } from "../types";
import * as jev from "./jevRagFilter";
import { createEmptyIndex, type LocalRagIndex, type LocalRagChunkMeta } from "./localRagStorage";
import { initLocalRagStore, resetLocalRagStore, searchLocalRagResults } from "./localRagStore";

const mocks = vi.hoisted(() => ({ native: vi.fn(), compatible: vi.fn(), externalIndex: vi.fn(), externalVectors: vi.fn() }));
vi.mock("./embeddingProvider", async original => ({
  ...await original<object>(), generateGeminiNativeEmbeddings: mocks.native, generateEmbeddings: mocks.compatible,
}));
vi.mock("./localRagStorage", async original => ({
  ...await original<object>(), loadExternalRagIndex: mocks.externalIndex, loadExternalRagVectors: mocks.externalVectors,
}));

const meta: LocalRagChunkMeta[] = [
  { filePath: "semantic.md", chunkIndex: 0, text: "Semantically related document" },
  { filePath: "exact.md", chunkIndex: 0, text: "PRJ-123" },
  { filePath: "both.txt", chunkIndex: 0, text: "PRJ-123 context extra details" },
];
const index: LocalRagIndex = { ...createEmptyIndex(), meta, dimension: 2, embeddingModel: "test", chunkSize: 500, chunkOverlap: 100 };
const vectors = new Float32Array([1, 0, 0, 1, 0.8, 0.6]);

function fixture() {
  const disk = new Map<string, string | ArrayBuffer>([
    ["LLMHub/rag/test/index.json", JSON.stringify(index)],
    ["LLMHub/rag/test/vectors.bin", vectors.buffer],
  ]);
  const files: TFile[] = [];
  const contents = new Map<string, string>();
  const adapter = {
    exists: vi.fn(async (path: string) => disk.has(path)),
    mkdir: vi.fn(async (path: string) => { disk.set(path, ""); }),
    read: vi.fn(async (path: string) => disk.get(path) as string),
    readBinary: vi.fn(async (path: string) => disk.get(path) as ArrayBuffer),
    write: vi.fn(async (path: string, value: string) => { disk.set(path, value); }),
    writeBinary: vi.fn(async (path: string, value: ArrayBuffer) => { disk.set(path, value); }),
    remove: vi.fn(async (path: string) => { disk.delete(path); }),
    rmdir: vi.fn(async (path: string) => { for (const key of disk.keys()) if (key.startsWith(path + "/")) disk.delete(key); }),
  };
  const app = { vault: { adapter, getFiles: () => files, read: async (file: TFile) => contents.get(file.path)! } } as unknown as App;
  const setting = { ...DEFAULT_RAG_SETTING, embeddingModel: "test", embeddingBaseUrl: "http://embedding", jevRagFilterEnabled: false, topK: 5 };
  return { disk, files, contents, adapter, app, setting };
}

beforeEach(() => {
  resetLocalRagStore(); vi.resetAllMocks();
  mocks.native.mockImplementation(async inputs => inputs.map(() => [1, 0]));
  mocks.compatible.mockImplementation(async inputs => inputs.map(() => [1, 0]));
});
afterEach(() => { vi.restoreAllMocks(); resetLocalRagStore(); });

describe("hybrid local RAG retrieval", () => {
  async function search(f: ReturnType<typeof fixture>, overrides: Partial<RagSetting> = {}) {
    const setting = { ...f.setting, ...overrides };
    await initLocalRagStore().load(f.app, ["test"], { test: setting });
    return searchLocalRagResults("test", "PRJ-123", setting, "key");
  }

  it("preserves vector-only scores, ordering and strict threshold without BM25 I/O", async () => {
    const f = fixture();
    const results = await search(f, { scoreThreshold: 0.5 });
    expect(results.map(r => r.filePath)).toEqual(["semantic.md", "both.txt"]);
    expect(results[0].score).toBe(1);
    expect(results[1].score).toBeCloseTo(0.8);
    expect(f.adapter.exists.mock.calls.some(([path]) => path.endsWith("bm25.json"))).toBe(false);
    expect(f.adapter.write).not.toHaveBeenCalled();
  });

  it("retains BM25-only matches below the vector threshold, then limits fused results", async () => {
    const f = fixture();
    const results = await search(f, { hybridSearch: true, scoreThreshold: 0.95, topK: 2 });
    expect(results.map(r => r.filePath)).toEqual(["semantic.md", "exact.md"]);
    expect(results.map(r => r.score)).toEqual([1 / 61, 1 / 61]);
    expect(f.disk.has("LLMHub/rag/test/bm25.json")).toBe(true);
    expect(mocks.compatible).toHaveBeenCalledTimes(1); // query only, no re-embedding
  });

  it("promotes a candidate found in both rankings and filters extensions before BM25 topK", async () => {
    const f = fixture();
    expect((await search(f, { hybridSearch: true })).at(0)?.filePath).toBe("both.txt");
    resetLocalRagStore();
    const filtered = await search(f, { hybridSearch: true, searchFileExtensions: [".TXT"], hybridCandidateK: 1 });
    expect(filtered.map(r => r.filePath)).toEqual(["both.txt"]);
    expect(filtered[0].score).toBe(2 / 61);
  });

  it("passes the fused topK, including lexical-only matches, through the existing Jev filter", async () => {
    const f = fixture();
    vi.spyOn(jev, "getJevRagFilterConfig").mockReturnValue({ apiKey: "jev-key", useOpenRouter: false });
    const filter = vi.spyOn(jev, "filterRagResultsWithJev").mockImplementation(async (_query, batch) => batch.filter(r => r.filePath === "exact.md"));
    const setting = { ...f.setting, hybridSearch: true, scoreThreshold: 0.95, topK: 2, jevRagFilterEnabled: true };
    await initLocalRagStore().load(f.app, ["test"], { test: setting });
    const results = await searchLocalRagResults("test", "PRJ-123", setting, "key", undefined, undefined, undefined, DEFAULT_SETTINGS);
    expect(results.map(r => r.filePath)).toEqual(["exact.md"]);
    expect(filter.mock.calls[0][1].map(r => r.filePath)).toEqual(["semantic.md", "exact.md"]);
  });

  it("keeps in-flight searches consistent when a sync replaces their cached corpus", async () => {
    const f = fixture();
    const setting = { ...f.setting, hybridSearch: true };
    await search(f, setting); // Populate the old entry's postings.
    let resolveEmbedding: (value: number[][]) => void;
    mocks.compatible.mockImplementationOnce(() => new Promise(resolve => { resolveEmbedding = resolve; }));
    const pending = searchLocalRagResults("test", "PRJ-123", setting, "key");
    await vi.waitFor(() => expect(resolveEmbedding).toBeTypeOf("function"));
    f.files.push(Object.assign(new TFile(), { path: "new.md", name: "new.md", extension: "md" }));
    f.contents.set("new.md", "new corpus");
    await initLocalRagStore().sync(f.app, "test", "key", "test", 500, 100, 6,
      { includeFolders: [], excludePatterns: [] }, undefined, "http://embedding", false, undefined, undefined, true);
    resolveEmbedding!([[1, 0]]);
    expect((await pending).find(r => r.filePath === "exact.md")?.text).toBe("PRJ-123");
  });

  it.each([undefined, '{"version":0}', '{invalid', '{"version":1,"tokenizer":"obsolete"}'])(
    "automatically builds/rebuilds a missing or old sidecar (%s)", async cache => {
      const f = fixture();
      if (cache) f.disk.set("LLMHub/rag/test/bm25.json", cache);
      const results = await search(f, { hybridSearch: true });
      expect(results.some(r => r.filePath === "exact.md")).toBe(true);
      expect(JSON.parse(f.disk.get("LLMHub/rag/test/bm25.json") as string).version).toBe(1);
      expect(mocks.compatible).toHaveBeenCalledTimes(1);
    },
  );

  it("builds combined and multiple external indexes in memory without sidecar writes", async () => {
    const f = fixture();
    const store = initLocalRagStore();
    f.disk.set("LLMHub/rag/second/index.json", JSON.stringify({ ...index, meta: [{ ...meta[1], filePath: "second.md" }] }));
    f.disk.set("LLMHub/rag/second/vectors.bin", new Float32Array([0, 1]).buffer);
    const combined = { ...f.setting, hybridSearch: true, sourceRagSettings: ["test", "second"] };
    await store.load(f.app, ["combined"], { combined });
    const results = await searchLocalRagResults("combined", "PRJ-123", combined, "key");
    expect(results.map(r => r.filePath)).toContain("second.md");
    expect(f.adapter.write).not.toHaveBeenCalled();
    resetLocalRagStore();
    mocks.externalIndex.mockResolvedValue(index);
    mocks.externalVectors.mockResolvedValue(vectors);
    const external = { ...f.setting, hybridSearch: true, topK: 10, externalIndexPath: "/a\n/b" };
    await initLocalRagStore().load(f.app, ["external"], { external });
    const matches = await searchLocalRagResults("external", "PRJ-123", external, "key");
    expect(matches.filter(r => r.filePath === "exact.md")).toHaveLength(2);
    expect(mocks.externalIndex).toHaveBeenCalledTimes(2);
    expect(f.adapter.write).not.toHaveBeenCalled();
  });

  it("updates the BM25 sidecar on sync additions, edits and deletion, skipping unchanged embeddings", async () => {
    const f = fixture();
    f.disk.clear();
    const add = (path: string, text: string) => {
      f.files.push(Object.assign(new TFile(), { path, name: path, extension: "md" }));
      f.contents.set(path, text);
    };
    add("a.md", "alpha"); add("b.md", "beta");
    const store = initLocalRagStore();
    const sync = (enabled = true) => store.sync(f.app, "test", "key", "test", 500, 100, 6,
      { includeFolders: [], excludePatterns: [] }, undefined, "http://embedding", false, undefined, undefined, enabled);
    await sync();
    mocks.compatible.mockClear();
    await sync();
    expect(mocks.compatible).not.toHaveBeenCalled();
    f.contents.set("a.md", "updated");
    f.files.splice(f.files.findIndex(file => file.path === "b.md"), 1);
    add("c.md", "gamma");
    await sync();
    expect(mocks.compatible).toHaveBeenCalledTimes(2);
    const newIndex = JSON.parse(f.disk.get("LLMHub/rag/test/index.json") as string) as LocalRagIndex;
    const snapshot = JSON.parse(f.disk.get("LLMHub/rag/test/bm25.json") as string);
    const bm25 = new ChunkBm25Index(newIndex.meta, snapshot);
    expect(bm25.search("alpha beta", 10)).toEqual([]);
    expect(bm25.search("updated gamma", 10)).toHaveLength(2);
    const sidecar = f.disk.get("LLMHub/rag/test/bm25.json");
    f.contents.set("a.md", "offmode");
    await sync(false);
    expect(f.disk.get("LLMHub/rag/test/bm25.json")).toBe(sidecar);
    store.clearAll();
    const results = await searchLocalRagResults("test", "offmode", { ...f.setting, hybridSearch: true }, "key");
    expect(results.some(r => r.text === "offmode")).toBe(true);
    expect(f.disk.get("LLMHub/rag/test/bm25.json")).not.toBe(sidecar);
  });
});
