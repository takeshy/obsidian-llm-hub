import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { TFile, type App } from "obsidian";
import { initLocalRagStore, resetLocalRagStore, searchLocalRagResults } from "./localRagStore";
import { DEFAULT_RAG_SETTING } from "../types";

const mocks = vi.hoisted(() => ({
  native: vi.fn(), compatible: vi.fn(), convertHtml: vi.fn(),
  loadIndex: vi.fn(), saveIndex: vi.fn(), loadVectors: vi.fn(), saveVectors: vi.fn(),
}));
vi.mock("obsidian", async original => ({ ...await original<object>(), htmlToMarkdown: mocks.convertHtml }));
vi.mock("./embeddingProvider", async original => ({
  ...await original<object>(), generateGeminiNativeEmbeddings: mocks.native, generateEmbeddings: mocks.compatible,
}));
vi.mock("./localRagStorage", async original => ({
  ...await original<object>(), loadRagIndex: mocks.loadIndex, saveRagIndex: mocks.saveIndex,
  loadRagVectors: mocks.loadVectors, saveRagVectors: mocks.saveVectors,
}));

beforeEach(() => {
  vi.resetAllMocks(); resetLocalRagStore();
  mocks.loadIndex.mockResolvedValue(null); mocks.loadVectors.mockResolvedValue(null);
  mocks.saveIndex.mockImplementation(async (_app, _name, index) => { mocks.loadIndex.mockResolvedValue(structuredClone(index)); });
  mocks.saveVectors.mockImplementation(async (_app, _name, vectors) => { mocks.loadVectors.mockResolvedValue(vectors.slice()); });
  mocks.native.mockImplementation(async inputs => inputs.map(() => [1, 0]));
  mocks.compatible.mockImplementation(async inputs => inputs.map(() => [1, 0]));
  mocks.convertHtml.mockReturnValue("# Schedule\nFriday launch.");
});
afterEach(() => resetLocalRagStore());

function fixture() {
  const paths = ["Notes/one.md", "Notes/two.html", "Notes/three.htm", "Notes/four.txt", "Notes/upper.HTML", "Notes/upper.TXT"];
  const allPaths = [...paths, "Private/secret.txt", "Notes/excluded.html", "Notes/image.png"];
  const files = allPaths.map(path => Object.assign(new TFile(), { path, name: path.split("/").pop(), extension: path.split(".").pop() }));
  const contents = new Map(allPaths.map(path => [path, /\.html?$/i.test(path) ? "<h1>Schedule</h1><p>Friday launch.</p>" : "Plain schedule.\nFriday launch."]));
  const read = vi.fn(async (file: TFile) => contents.get(file.path)!);
  const readBinary = vi.fn();
  const stat = vi.fn();
  const app = { vault: { getFiles: () => files, read, readBinary, adapter: { stat } } } as unknown as App;
  return { paths, files, contents, read, readBinary, stat, app };
}

describe("Local RAG HTML and plain text", () => {
  it.each([false, true])("indexes text formats with multimodal disabled (Gemini native: %s), then searches the stored text", async native => {
    const f = fixture(), store = initLocalRagStore();
    const baseUrl = native ? undefined : "https://embeddings.example/v1";
    const model = native ? "gemini-embedding-2" : "text-embedding";
    const sync = () => store.sync(f.app, "Text", "key", model, 1000, 0, 6,
      { includeFolders: ["Notes"], excludePatterns: ["excluded"] }, undefined, baseUrl, false);
    const first = await sync();
    expect(first).toMatchObject({ embedded: f.paths.length, errors: [], failedFiles: [] });
    expect(f.readBinary).not.toHaveBeenCalled(); expect(f.stat).not.toHaveBeenCalled();
    expect([...new Set(f.read.mock.calls.map(([file]) => file.path))].sort()).toEqual([...f.paths].sort());
    const index = mocks.saveIndex.mock.calls.at(-1)![2];
    expect(index.meta.map(item => item.filePath).sort()).toEqual([...f.paths].sort());
    expect(index.meta.every(item => item.contentType === "text" && !item.text.includes("<h1>"))).toBe(true);
    expect(index.meta.find(item => item.filePath === "Notes/two.html").text).toBe("# Schedule\nFriday launch.");
    expect(index.meta.find(item => item.filePath === "Notes/four.txt").text).toContain("Plain schedule.");
    expect(mocks.convertHtml).toHaveBeenCalledTimes(3);
    const embed = native ? mocks.native : mocks.compatible;
    expect(embed).toHaveBeenCalledTimes(f.paths.length);
    expect(native ? mocks.compatible : mocks.native).not.toHaveBeenCalled();

    embed.mockClear(); mocks.convertHtml.mockClear();
    expect(await sync()).toMatchObject({ embedded: 0, skipped: f.paths.length, errors: [] });
    expect(embed).not.toHaveBeenCalled(); expect(mocks.convertHtml).not.toHaveBeenCalled();

    const results = await searchLocalRagResults("Text", "launch",
      { ...DEFAULT_RAG_SETTING, embeddingModel: model, embeddingBaseUrl: baseUrl ?? "", topK: 10, scoreThreshold: 0, searchFileExtensions: ["html", "htm", "txt"] }, "key");
    expect(results.map(item => item.filePath).sort()).toEqual(f.paths.filter(path => !path.endsWith(".md")).sort());
    expect(results.every(item => item.contentType === "text" && item.text.includes("Friday launch."))).toBe(true);

    f.contents.set("Notes/two.html", "<p>New launch date.</p>");
    mocks.convertHtml.mockReturnValue("New launch date."); embed.mockClear();
    expect(await sync()).toMatchObject({ embedded: 1, skipped: f.paths.length - 1, errors: [] });
    expect(embed).toHaveBeenCalledTimes(1);
    expect(mocks.saveIndex.mock.calls.at(-1)![2].meta.find(item => item.filePath === "Notes/two.html").text).toBe("New launch date.");
  });

  it("keeps HTML conversion failures retryable and skips empty HTML on later syncs", async () => {
    const f = fixture(), store = initLocalRagStore();
    const html = f.files.find(file => file.path === "Notes/two.html")!;
    f.app.vault.getFiles = () => [html];
    const sync = () => store.sync(f.app, "Text", "key", "gemini-embedding-2", 1000, 0, 6, { includeFolders: [], excludePatterns: [] });
    mocks.convertHtml.mockImplementationOnce(() => { throw new Error("conversion failed"); });
    expect(await sync()).toMatchObject({ embedded: 0, errors: ["Notes/two.html: conversion failed"] });
    expect(mocks.saveIndex.mock.calls.at(-1)![2].fileChecksums).not.toHaveProperty("Notes/two.html");
    mocks.convertHtml.mockReturnValue("");
    expect(await sync()).toMatchObject({ embedded: 0, errors: [] });
    expect(await sync()).toMatchObject({ embedded: 0, skipped: 1, errors: [] });
    expect(mocks.native).not.toHaveBeenCalled();
  });
});
