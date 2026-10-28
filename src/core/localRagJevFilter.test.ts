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
    return searchLocalRagResults("test", "train arrival", DEFAULT_RAG_SETTING, "embedding-key",
      undefined, undefined, undefined, { ...settings, jevRagFilterEnabled: filterEnabled });
  }

  function respond(answers: Record<string, { choice: string }>) {
    request.mockResolvedValue(new Response(JSON.stringify({ answers }), { status: 200 }));
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
});
