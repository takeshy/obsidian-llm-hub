import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { extractPdfText } from "obsidian-llm-hub-common/vault";
import { DEFAULT_RAG_SETTING, DEFAULT_SETTINGS } from "../types";
import {
  initLocalRagStore,
  resetLocalRagStore,
  searchLocalRagResults,
  type LocalRagSearchResult,
} from "./localRagStore";
import { createNodeFetch } from "./proxyFetch";
import { renderRagPdfImages } from "./ragPdfImages";

vi.mock("./ragPdfImages", () => ({ renderRagPdfImages: vi.fn() }));

vi.mock("obsidian-llm-hub-common/vault", async (importOriginal) => ({
  ...(await importOriginal<typeof import("obsidian-llm-hub-common/vault")>()),
  extractPdfText: vi.fn(),
}));
vi.mock("./proxyFetch", () => ({ createNodeFetch: vi.fn(), createProxyFetch: vi.fn() }));

const app = {} as App;
const settings = {
  ...DEFAULT_SETTINGS,
  apiProviders: [{ type: "openrouter", apiKey: "router-key" }] as typeof DEFAULT_SETTINGS.apiProviders,
  jevRagFilterEnabled: true,
  jevUseOpenRouter: true,
};
const pdf: LocalRagSearchResult = {
  filePath: "Docs/report.pdf",
  text: "[Pdf: report.pdf (pages 3-4 of 10)]",
  contentType: "pdf",
  pageLabel: "pages 3-4 of 10",
  chunkIndex: 2,
  score: 0.9,
};
const unrelated: LocalRagSearchResult = {
  filePath: "recipe.md", text: "Bake bread.", chunkIndex: 0, score: 0.8,
};

describe("Jev filtering of PDF search results", () => {
  const request = vi.fn<typeof fetch>();

  beforeEach(async () => {
    resetLocalRagStore();
    vi.mocked(extractPdfText).mockReset();
    request.mockReset();
    vi.mocked(renderRagPdfImages).mockReset().mockResolvedValue(null);
    vi.mocked(createNodeFetch).mockReturnValue(request);
    const store = initLocalRagStore();
    await store.load(app, []);
    vi.spyOn(store, "search").mockResolvedValue([pdf, unrelated]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetLocalRagStore();
  });

  function search(filterEnabled = true) {
    return searchLocalRagResults("test", "train arrival",
      { ...DEFAULT_RAG_SETTING, jevRagFilterEnabled: filterEnabled }, "embedding-key",
      undefined, undefined, undefined, settings);
  }

  function respond(answers: Record<string, { choice: string }>) {
    request.mockImplementation(async () => new Response(JSON.stringify({ answers }), { status: 200 }));
  }

  it("judges the matched PDF pages and preserves the original result and attachment metadata", async () => {
    vi.mocked(extractPdfText).mockResolvedValue("[Page 3]\nThe train arrives at 09:10.");
    respond({ result_0: { choice: "keep" }, result_1: { choice: "exclude" } });

    const results = await search();

    expect(results).toEqual([pdf]);
    expect(results[0]).toBe(pdf);
    expect(extractPdfText).toHaveBeenCalledExactlyOnceWith(app, pdf.filePath, 3, 4);
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(body.questions.result_0.instructions).toContain("The train arrives at 09:10.");
    expect(body.questions.result_0.instructions).not.toContain(pdf.text);
  });

  it("can exclude a PDF using its actual contents", async () => {
    vi.mocked(extractPdfText).mockResolvedValue("[Page 3]\nBake bread.");
    respond({ result_0: { choice: "exclude" }, result_1: { choice: "exclude" } });
    await expect(search()).resolves.toEqual([]);
  });

  it.each([null, "", "   "])("retains PDFs with unavailable text (%j) while filtering text chunks", async (text) => {
    vi.mocked(extractPdfText).mockResolvedValue(text);
    respond({ result_1: { choice: "exclude" } });

    await expect(search()).resolves.toEqual([pdf]);
    const body = JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(Object.keys(body.questions)).toEqual(["result_1"]);
  });

  it("retains a PDF when extraction throws", async () => {
    vi.mocked(extractPdfText).mockRejectedValue(new Error("unreadable PDF"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    respond({ result_1: { choice: "exclude" } });
    await expect(search()).resolves.toEqual([pdf]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it.each([true, false])("judges scanned pages as images (OpenRouter: %s) and preserves metadata", async (useOpenRouter) => {
    vi.mocked(extractPdfText).mockResolvedValue(null);
    vi.mocked(renderRagPdfImages).mockResolvedValue([
      { type: "image", format: "jpg", data_base64: "page3" },
      { type: "image", format: "jpg", data_base64: "page4" },
    ]);
    request.mockResolvedValueOnce(new Response(JSON.stringify({ answers: { result_0: { choice: "keep" } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ answers: { result_1: { choice: "exclude" } } })));
    await expect(searchLocalRagResults("test", "train arrival", DEFAULT_RAG_SETTING,
      "embedding-key", undefined, undefined, undefined,
      { ...settings, jevUseOpenRouter: useOpenRouter, jevApiKey: "direct-key" })).resolves.toEqual([pdf]);
    expect(renderRagPdfImages).toHaveBeenCalledExactlyOnceWith(app, pdf.filePath, 3, 4);
    const [url, init] = request.mock.calls[0];
    expect(url).toContain(useOpenRouter ? "openrouter.ai" : "jevtypesafeai.com");
    expect(init?.headers).toMatchObject({ "TypeSafe-Danger-Zone-Images": "true", "TypeSafe-Danger-Zone-Long-Context": "true" });
    const body = JSON.parse(String(init?.body));
    expect(Object.values(body.assets).map((image: { data_base64: string }) => image.data_base64)).toEqual(["page3", "page4"]);
    for (const reference of Object.keys(body.assets)) expect(body.questions.result_0.instructions).toContain(reference);
    const textBody = JSON.parse(String(request.mock.calls[1][1]?.body));
    expect(textBody.assets).toBeUndefined();
    expect(Object.keys(textBody.questions)).toEqual(["result_1"]);
  });

  it("can exclude a scanned PDF and does not call Jev again for image-only results", async () => {
    vi.mocked(initLocalRagStore().search).mockResolvedValue([pdf]);
    vi.mocked(extractPdfText).mockResolvedValue(null);
    vi.mocked(renderRagPdfImages).mockResolvedValue([{ type: "image", format: "jpg", data_base64: "page" }]);
    respond({ result_0: { choice: "exclude" } });
    await expect(search()).resolves.toEqual([]);
    expect(request).toHaveBeenCalledOnce();
  });

  it("retains a scan when image rendering throws", async () => {
    vi.mocked(extractPdfText).mockResolvedValue(null);
    vi.mocked(renderRagPdfImages).mockRejectedValue(new Error("cannot render"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    respond({ result_1: { choice: "exclude" } });
    await expect(search()).resolves.toEqual([pdf]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("does not call Jev when all results lack judgeable text", async () => {
    vi.mocked(initLocalRagStore().search).mockResolvedValue([pdf]);
    vi.mocked(extractPdfText).mockResolvedValue(null);
    await expect(search()).resolves.toEqual([pdf]);
    expect(request).not.toHaveBeenCalled();
  });

  it("does not extract the whole PDF when the page range is missing or invalid", async () => {
    const unlabelled = { ...pdf, pageLabel: "unknown" };
    vi.mocked(initLocalRagStore().search).mockResolvedValue([unlabelled]);
    await expect(search()).resolves.toEqual([unlabelled]);
    expect(extractPdfText).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    expect(renderRagPdfImages).not.toHaveBeenCalled();
  });

  it("uses already indexed PDF text without re-extracting it", async () => {
    const textPdf = { ...pdf, text: "The train arrives at 09:10." };
    vi.mocked(initLocalRagStore().search).mockResolvedValue([textPdf]);
    respond({ result_0: { choice: "keep" } });
    await expect(search()).resolves.toEqual([textPdf]);
    expect(extractPdfText).not.toHaveBeenCalled();
  });

  it("does not extract PDF text when Jev filtering is disabled", async () => {
    await expect(search(false)).resolves.toEqual([pdf, unrelated]);
    expect(extractPdfText).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("filters one index and leaves another unfiltered with shared credentials", async () => {
    vi.mocked(extractPdfText).mockResolvedValue("The train arrives at 09:10.");
    respond({ result_0: { choice: "keep" }, result_1: { choice: "exclude" } });
    // The legacy global flag must no longer override per-index choices.
    const shared = { ...settings, jevRagFilterEnabled: false };
    await expect(searchLocalRagResults("Notes", "train arrival", DEFAULT_RAG_SETTING,
      "embedding-key", undefined, undefined, undefined, shared)).resolves.toEqual([pdf]);
    await expect(searchLocalRagResults("PDFs", "train arrival",
      { ...DEFAULT_RAG_SETTING, jevRagFilterEnabled: false }, "embedding-key",
      undefined, undefined, undefined, shared)).resolves.toEqual([pdf, unrelated]);
    expect(request).toHaveBeenCalledOnce();
    expect(extractPdfText).toHaveBeenCalledOnce();
  });

  it("fills the target result count in Top K batches without repeating vector search or decisions", async () => {
    const candidates = Array.from({ length: 8 }, (_, index) => ({
      filePath: `note-${index}.md`, text: `Candidate ${index}`, chunkIndex: 0, score: 1 - index / 10,
    }));
    const vectorSearch = vi.mocked(initLocalRagStore().search).mockResolvedValue(candidates);
    const judged: string[] = [];
    request.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      const answers: Record<string, { choice: string }> = {};
      for (const [key, question] of Object.entries(body.questions)) {
        const instructions = (question as { instructions: string }).instructions;
        const name = /note-\d+\.md/.exec(instructions)![0];
        judged.push(name);
        answers[key] = { choice: ["note-1.md", "note-4.md"].includes(name) ? "keep" : "exclude" };
      }
      return new Response(JSON.stringify({ answers }));
    });
    await expect(searchLocalRagResults("test", "query", { ...DEFAULT_RAG_SETTING, scoreThreshold: 0.3,
      searchFileExtensions: ["md"] }, "embedding-key", undefined, undefined, 2, settings, 2))
      .resolves.toEqual([candidates[1], candidates[4]]);
    expect(vectorSearch).toHaveBeenCalledOnce();
    expect(vectorSearch.mock.calls[0][4]).toBe(Infinity);
    expect(vectorSearch.mock.calls[0][6]).toBe(0.3);
    expect(vectorSearch.mock.calls[0][7]).toEqual(["md"]);
    expect(judged).toEqual(candidates.slice(0, 6).map(candidate => candidate.filePath));
  });

  it("returns fewer than the target result count when eligible candidates run out", async () => {
    const candidates = Array.from({ length: 5 }, (_, index) => ({
      filePath: `note-${index}.md`, text: `Candidate ${index}`, chunkIndex: 0, score: 0.9,
    }));
    vi.mocked(initLocalRagStore().search).mockResolvedValue(candidates);
    request.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ answers: Object.fromEntries(Object.keys(body.questions)
        .map(key => [key, { choice: request.mock.calls.length === 1 && key === "result_0" ? "keep" : "exclude" }])) }));
    });
    await expect(searchLocalRagResults("test", "query", DEFAULT_RAG_SETTING,
      "embedding-key", undefined, undefined, 2, settings, 4)).resolves.toEqual([candidates[0]]);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("stops after the first batch when it already fills Top K", async () => {
    vi.mocked(initLocalRagStore().search).mockResolvedValue([unrelated, { ...unrelated, filePath: "later.md" }]);
    respond({ result_0: { choice: "keep" } });
    await expect(searchLocalRagResults("test", "query", DEFAULT_RAG_SETTING,
      "embedding-key", undefined, undefined, 1, settings)).resolves.toEqual([unrelated]);
    expect(request).toHaveBeenCalledOnce();
  });

  it("returns no results when Jev excludes every candidate", async () => {
    vi.mocked(initLocalRagStore().search).mockResolvedValue([unrelated, { ...unrelated, filePath: "later.md" }]);
    respond({ result_0: { choice: "exclude" } });
    await expect(searchLocalRagResults("test", "query", DEFAULT_RAG_SETTING,
      "embedding-key", undefined, undefined, 1, settings, 2)).resolves.toEqual([]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("checks only Top K candidates when the target result count is blank", async () => {
    const vectorSearch = vi.mocked(initLocalRagStore().search).mockResolvedValue([
      unrelated, { ...unrelated, filePath: "later.md" },
    ]);
    respond({ result_0: { choice: "exclude" } });
    await expect(searchLocalRagResults("test", "query", DEFAULT_RAG_SETTING,
      "embedding-key", undefined, undefined, 1, settings)).resolves.toEqual([]);
    expect(vectorSearch.mock.calls[0][4]).toBe(1);
    expect(request).toHaveBeenCalledOnce();
  });

  it("can collect more results than Top K and trims the last batch to the target", async () => {
    const candidates = Array.from({ length: 6 }, (_, index) => ({
      ...unrelated, filePath: `note-${index}.md`,
    }));
    vi.mocked(initLocalRagStore().search).mockResolvedValue(candidates);
    respond({ result_0: { choice: "keep" }, result_1: { choice: "keep" } });
    await expect(searchLocalRagResults("test", "query", DEFAULT_RAG_SETTING,
      "embedding-key", undefined, undefined, 2, settings, 3)).resolves.toEqual(candidates.slice(0, 3));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("limits results to the target even when it is smaller than Top K", async () => {
    vi.mocked(initLocalRagStore().search).mockResolvedValue([
      unrelated, { ...unrelated, filePath: "later.md" },
    ]);
    respond({ result_0: { choice: "keep" }, result_1: { choice: "keep" } });
    await expect(searchLocalRagResults("test", "query", DEFAULT_RAG_SETTING,
      "embedding-key", undefined, undefined, 2, settings, 1)).resolves.toEqual([unrelated]);
    expect(request).toHaveBeenCalledOnce();
  });

  it("keeps the original retrieval limit when filtering is disabled or unconfigured", async () => {
    const vectorSearch = vi.mocked(initLocalRagStore().search);
    await search(false);
    expect(vectorSearch.mock.calls[0][4]).toBe(DEFAULT_RAG_SETTING.topK);
    await searchLocalRagResults("test", "query", DEFAULT_RAG_SETTING,
      "embedding-key", undefined, undefined, 3, { ...settings, apiProviders: [], jevApiKey: "" }, 10);
    expect(vectorSearch.mock.calls[1][4]).toBe(3);
    expect(request).not.toHaveBeenCalled();
  });

  it("does not filter or extract PDF text without configured Jev credentials", async () => {
    await expect(searchLocalRagResults("test", "train arrival", DEFAULT_RAG_SETTING,
      "embedding-key", undefined, undefined, undefined,
      { ...settings, apiProviders: [], jevApiKey: "   " })).resolves.toEqual([pdf, unrelated]);
    expect(request).not.toHaveBeenCalled();
    expect(extractPdfText).not.toHaveBeenCalled();
  });
});
