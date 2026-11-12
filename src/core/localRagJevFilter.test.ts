import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { extractPdfText } from "obsidian-llm-hub-common/vault";
import { DEFAULT_RAG_SETTING, DEFAULT_SETTINGS } from "../types";
import { clearJevRerankCache } from "./jevRagRerank";
import { initLocalRagStore, resetLocalRagStore, searchLocalRagResults, type LocalRagSearchResult } from "./localRagStore";
import { createNodeFetch } from "./proxyFetch";
import { renderRagImage, renderRagPdfImages } from "./ragPdfImages";
import { workflowRagSearchSetting } from "../workflow/ragSearchOptions";

vi.mock("./ragPdfImages", () => ({ renderRagPdfImages: vi.fn(), renderRagImage: vi.fn() }));
vi.mock("obsidian-llm-hub-common/vault", async original => ({ ...await original<object>(), extractPdfText: vi.fn() }));
vi.mock("./proxyFetch", () => ({ createNodeFetch: vi.fn(), createProxyFetch: vi.fn() }));

const app = {} as App;
const settings = { ...DEFAULT_SETTINGS, jevUseOpenRouter: true,
  apiProviders: [{ type: "openrouter", apiKey: "router-key" }] as typeof DEFAULT_SETTINGS.apiProviders };
const enabled = { ...DEFAULT_RAG_SETTING, jevMode: "rerank" as const, jevRagFilterEnabled: true, topK: 2, jevRerankCandidateK: 2 };
const pdf: LocalRagSearchResult = { filePath: "report.pdf", text: "[Pdf: report.pdf (pages 3-4 of 10)]",
  contentType: "pdf", pageLabel: "pages 3-4 of 10", chunkIndex: 2, score: 0.9 };
const other: LocalRagSearchResult = { filePath: "recipe.md", text: "Bake bread.", chunkIndex: 0, score: 0.8 };
const candidates = (count: number) => Array.from({ length: count }, (_, i) => ({
  filePath: `note-${i}.md`, text: `Passage ${i}`, chunkIndex: 0, score: 1 - i / 20,
}));
const scoreResponse = (scores: number[]) => new Response(JSON.stringify({ answers: Object.fromEntries(
  scores.map((score, i) => [`result_${i}`, { type: "score", score }]),
) }));

describe("Unified Jev reranking and search until score 2", () => {
  const request = vi.fn<typeof fetch>();
  beforeEach(async () => {
    resetLocalRagStore(); clearJevRerankCache(); request.mockReset();
    vi.mocked(extractPdfText).mockReset().mockResolvedValue("The train arrives at 09:10.");
    vi.mocked(renderRagPdfImages).mockReset().mockResolvedValue(null);
    vi.mocked(renderRagImage).mockReset().mockResolvedValue(null);
    vi.mocked(createNodeFetch).mockReturnValue(request);
    const store = initLocalRagStore(); await store.load(app, []);
    vi.spyOn(store, "search").mockResolvedValue([pdf, other]);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); resetLocalRagStore(); clearJevRerankCache(); });
  const search = (repeat = false) => searchLocalRagResults("test", "train arrival", enabled, "key", undefined, undefined, undefined, settings, repeat);

  it("uses Score and resolved PDF text, retaining scores and media metadata", async () => {
    request.mockImplementation(async () => scoreResponse([2.9, 0.1]));
    expect(await search()).toEqual([{ ...pdf, jevScore: 2.9 }, { ...other, jevScore: 0.1 }]);
    expect(extractPdfText).toHaveBeenCalledExactlyOnceWith(app, pdf.filePath, 3, 4);
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.questions.result_0.type).toBe("score");
    expect(body.questions.result_0.instructions).toContain("The train arrives at 09:10.");
    expect(body.questions.result_0.instructions).not.toContain(pdf.text);
  });

  it("reranks low scores too when repeating is off", async () => {
    request.mockImplementation(async () => scoreResponse([0.1, 1.99]));
    expect(await search()).toEqual([{ ...other, jevScore: 1.99 }, { ...pdf, jevScore: 0.1 }]);
    expect(request).toHaveBeenCalledOnce();
  });

  it("checks complete batches until a score of exactly 2 or higher occurs, then sorts the qualifying results", async () => {
    const all = candidates(7), judged: string[] = [];
    const retrieval = vi.mocked(initLocalRagStore().search).mockResolvedValue(all);
    request.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      const answers = Object.fromEntries(Object.entries(body.questions).map(([key, value]) => {
        const path = /note-\d+\.md/.exec((value as { instructions: string }).instructions)![0]; judged.push(path);
        return [key, { type: "score", score: path === "note-2.md" ? 2 : path === "note-3.md" ? 2.8 : 1.99 }];
      }));
      return new Response(JSON.stringify({ answers }));
    });
    expect(await search(true)).toEqual([{ ...all[3], jevScore: 2.8 }, { ...all[2], jevScore: 2 }]);
    expect(retrieval).toHaveBeenCalledOnce(); expect(retrieval.mock.calls[0][4]).toBe(Infinity);
    expect(judged).toEqual(all.slice(0, 4).map(r => r.filePath)); expect(request).toHaveBeenCalledTimes(2);
  });

  it("finds an answer in the final partial batch", async () => {
    const all = candidates(5); vi.mocked(initLocalRagStore().search).mockResolvedValue(all);
    request.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      return scoreResponse(Object.keys(body.questions).map(() => request.mock.calls.length === 3 ? 2 : 0.5));
    });
    expect(await search(true)).toEqual([{ ...all[4], jevScore: 2 }]); expect(request).toHaveBeenCalledTimes(3);
  });

  it("stops at the first qualifying batch even if fewer than topK reach 2", async () => {
    const all = candidates(4); vi.mocked(initLocalRagStore().search).mockResolvedValue(all);
    request.mockImplementation(async () => scoreResponse([1.99, 2]));
    expect(await search(true)).toEqual([{ ...all[1], jevScore: 2 }]); expect(request).toHaveBeenCalledOnce();
  });

  it("returns empty after exhausting candidates below 2", async () => {
    vi.mocked(initLocalRagStore().search).mockResolvedValue(candidates(5));
    request.mockImplementation(async () => scoreResponse([0, 1.99]));
    expect(await search(true)).toEqual([]); expect(request).toHaveBeenCalledTimes(3);
  });

  it.each([0, 1])("stops on failure and returns original topK (completed batches: %s)", async completed => {
    const all = candidates(6); vi.mocked(initLocalRagStore().search).mockResolvedValue(all);
    request.mockImplementation(async () => request.mock.calls.length > completed
      ? new Response("unavailable", { status: 503 }) : scoreResponse([0, 1]));
    expect(await search(true)).toEqual(all.slice(0, 2)); expect(request).toHaveBeenCalledTimes(completed + 1);
  });

  it("scores the whole batch before applying topK and the answer threshold", async () => {
    const all = candidates(4); vi.mocked(initLocalRagStore().search).mockResolvedValue(all);
    request.mockImplementation(async () => scoreResponse([0, 1.99, 2.2, 3]));
    expect(await searchLocalRagResults("test", "query", { ...enabled, topK: 1, jevRerankCandidateK: 4 }, "key",
      undefined, undefined, undefined, settings, true)).toEqual([{ ...all[3], jevScore: 3 }]);
    expect(request).toHaveBeenCalledOnce();
  });

  it("retrieves the default pool once without repeating, retaining stable ties", async () => {
    const all = candidates(5); const retrieval = vi.mocked(initLocalRagStore().search).mockResolvedValue(all);
    request.mockImplementation(async () => scoreResponse([1, 3, 3, 2, 0]));
    expect(await searchLocalRagResults("test", "query", { ...enabled, jevRerankCandidateK: 40 }, "key",
      undefined, undefined, undefined, settings)).toEqual([{ ...all[1], jevScore: 3 }, { ...all[2], jevScore: 3 }]);
    expect(retrieval.mock.calls[0][4]).toBe(40); expect(request).toHaveBeenCalledOnce();
  });

  it.each([true, false])("scores scanned PDFs individually on either provider (OpenRouter: %s)", async useOpenRouter => {
    vi.mocked(extractPdfText).mockResolvedValue(null);
    vi.mocked(renderRagPdfImages).mockResolvedValue([{ type: "image", format: "jpg", data_base64: "page3" }]);
    request.mockImplementation(async () => new Response(JSON.stringify({ answers: {
      [request.mock.calls.length === 1 ? "result_0" : "result_1"]: { type: "score", score: request.mock.calls.length === 1 ? 3 : 1 },
    } })));
    expect(await searchLocalRagResults("test", "train arrival", enabled, "key", undefined, undefined, undefined,
      { ...settings, jevUseOpenRouter: useOpenRouter, jevApiKey: "direct-key" }, true)).toEqual([{ ...pdf, jevScore: 3 }]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0]).toBe(useOpenRouter ? "https://openrouter.ai/api/alpha/decisions" : "https://api.typesafe.ai/v1/systemone");
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(Object.values(body.assets)).toEqual([{ type: "image", format: "jpg", data_base64: "page3" }]);
    expect(body.questions.result_0.type).toBe("score");
  });

  it("uses native image contents instead of a filename label", async () => {
    const image = { ...pdf, contentType: "image" as const, filePath: "image.png", text: "[Image: image.png]" };
    vi.mocked(initLocalRagStore().search).mockResolvedValue([image]);
    vi.mocked(renderRagImage).mockResolvedValue([{ type: "image", format: "jpg", data_base64: "image" }]);
    request.mockImplementation(async () => scoreResponse([2.5]));
    expect(await search(true)).toEqual([{ ...image, jevScore: 2.5 }]);
    expect(renderRagImage).toHaveBeenCalledExactlyOnceWith(app, "image.png");
  });

  it.each([null, "", "   "])("falls back when PDF content is unavailable (%j)", async text => {
    vi.mocked(extractPdfText).mockResolvedValue(text);
    expect(await search(true)).toEqual([pdf, other]); expect(request).not.toHaveBeenCalled();
  });

  it("does not extract an entire PDF if its page range is invalid", async () => {
    const invalid = { ...pdf, pageLabel: "unknown" }; vi.mocked(initLocalRagStore().search).mockResolvedValue([invalid]);
    expect(await search(true)).toEqual([invalid]);
    expect(extractPdfText).not.toHaveBeenCalled(); expect(renderRagPdfImages).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("uses indexed PDF text without re-extracting", async () => {
    const textPdf = { ...pdf, text: "The train arrives at 09:10." };
    vi.mocked(initLocalRagStore().search).mockResolvedValue([textPdf]); request.mockImplementation(async () => scoreResponse([3]));
    expect(await search(true)).toEqual([{ ...textPdf, jevScore: 3 }]); expect(extractPdfText).not.toHaveBeenCalled();
  });

  it("skips Jev without credentials or with the toggle off", async () => {
    const retrieval = vi.mocked(initLocalRagStore().search);
    expect(await searchLocalRagResults("test", "query", { ...enabled, jevMode: "off", jevRagFilterEnabled: false }, "key",
      undefined, undefined, undefined, settings, true)).toEqual([pdf, other]);
    await searchLocalRagResults("test", "query", enabled, "key", undefined, undefined, undefined,
      { ...settings, apiProviders: [], jevApiKey: "" }, true);
    expect(retrieval.mock.calls.map(call => call[4])).toEqual([2, 2]);
    expect(request).not.toHaveBeenCalled(); expect(extractPdfText).not.toHaveBeenCalled();
  });

  it("returns empty without a request when retrieval has no candidates", async () => {
    vi.mocked(initLocalRagStore().search).mockResolvedValue([]); expect(await search(true)).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it.each([[false, undefined, 1], [true, undefined, 2], [false, "true", 2], [true, "false", 1]] as const)(
    "honors saved repeat %s and workflow override %s", async (saved, override, calls) => {
      const all = candidates(2); const retrieval = vi.mocked(initLocalRagStore().search)
        .mockImplementation(async (_name, _query, _key, _model, count) => all.slice(0, count));
      request.mockImplementation(async () => scoreResponse([request.mock.calls.length === 2 ? 2 : 1.99]));
      const source = { ...enabled, topK: 1, jevRerankCandidateK: 1, searchUntilFound: saved };
      const resolved = workflowRagSearchSetting(source, override === undefined ? {} : { ragSearchUntilFound: override });
      const found = calls === 2;
      expect(await searchLocalRagResults("test", "query", resolved, "key", undefined, undefined, undefined, settings))
        .toEqual([{ ...all[found ? 1 : 0], jevScore: found ? 2 : 1.99 }]);
      expect(request).toHaveBeenCalledTimes(calls);
      expect(retrieval.mock.calls[0][4]).toBe(found ? Infinity : 1); expect(source.searchUntilFound).toBe(saved);
    });
});
