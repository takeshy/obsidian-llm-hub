import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, type ApiProviderConfig } from "../types";
import { getRagDecisionConfig, getRagDecisionModel, getRagDecisionModels } from "./ragDecision";
import { clearJevRerankCache, JEV_RERANK_TIMEOUT_MS, rerankRagResultsWithJev } from "./jevRagRerank";
import type { LocalRagSearchResult } from "./localRagStore";

const gemini: ApiProviderConfig = {
  id: "gemini", name: "My Gemini", type: "gemini", apiKey: " gemini-key ",
  baseUrl: "https://generativelanguage.googleapis.com", enabled: true, verified: true,
  enabledModels: ["gemini-test"], availableModels: ["gemini-test", "gemini-other"],
};
const settings = { ...DEFAULT_SETTINGS, apiProviders: [gemini], ragDecisionModel: "api:gemini:gemini-decision-1" };
const results: LocalRagSearchResult[] = [
  { filePath: "travel.md", text: "The train arrives at 09:10.", score: 0.8, chunkIndex: 0 },
  { filePath: "recipe.md", text: "Bake bread.", score: 0.7, chunkIndex: 0 },
];
const response = (scores: Record<string, unknown> = { result_0: 1, result_1: 2.7 }) => new Response(JSON.stringify({
  answers: Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, { type: "score", score }])),
}));

describe("RAG decision selection", () => {
  it("lists configured Jev and a fixed Gemini decision model per registered key", () => {
    expect(getRagDecisionModels(DEFAULT_SETTINGS)).toEqual([]);
    expect(getRagDecisionModels({ ...settings, jevApiKey: "direct-key" })).toEqual([
      { value: "jev", label: "Jev" }, { value: "api:gemini:gemini-decision-1", label: "My Gemini / gemini-decision-1" },
    ]);
    expect(getRagDecisionModels({ ...settings, apiProviders: [
      { ...gemini, apiKey: " " },
      { ...gemini, id: "other", type: "openai" },
    ] })).toEqual([]);
  });

  it("does not require chat models, a model catalogue, provider enablement, or chat verification", () => {
    const keyOnly = { ...settings, apiProviders: [{ ...gemini,
      enabled: false, verified: false, enabledModels: [], availableModels: [],
    }] };
    expect(getRagDecisionModels(keyOnly)).toEqual([
      { value: "api:gemini:gemini-decision-1", label: "My Gemini / gemini-decision-1" },
    ]);
    expect(getRagDecisionConfig(keyOnly)).toEqual({ apiKey: "gemini-key", useOpenRouter: false, useGemini: true });
  });

  it("normalizes earlier Gemini chat-model selections to the fixed decision model", () => {
    const legacy = { ...settings, ragDecisionModel: "api:gemini:gemini-other" };
    expect(getRagDecisionModel(legacy)).toBe("api:gemini:gemini-decision-1");
    expect(getRagDecisionConfig(legacy)).toEqual({ apiKey: "gemini-key", useOpenRouter: false, useGemini: true });
  });

  it("preserves legacy Jev credentials and explicit OpenRouter selection", () => {
    const { ragDecisionModel: _unused, ...legacy } = { ...DEFAULT_SETTINGS, jevApiKey: "jev-key" };
    expect(getRagDecisionConfig(legacy)).toEqual({ apiKey: "jev-key", useOpenRouter: false });
    expect(getRagDecisionConfig({ ...legacy, jevUseOpenRouter: true,
      apiProviders: [{ ...gemini, type: "openrouter", apiKey: "router-key" }],
    })).toEqual({ apiKey: "router-key", useOpenRouter: true });
  });

  it("uses the selected Gemini provider independently of text chat enablement and provider order", () => {
    expect(getRagDecisionConfig({ ...settings, jevApiKey: "jev-key", apiProviders: [
      { ...gemini, id: "other", apiKey: "other-key" }, { ...gemini, enabled: false },
    ] })).toEqual({ apiKey: "gemini-key", useOpenRouter: false, useGemini: true });
  });

  it("deactivates an unavailable selection without switching to another service", () => {
    expect(getRagDecisionConfig({ ...settings, jevApiKey: "jev-key", apiProviders: [] })).toBeNull();
    expect(getRagDecisionConfig({ ...settings, apiProviders: [{ ...gemini, apiKey: " " }] })).toBeNull();
    expect(getRagDecisionConfig({ ...settings, apiProviders: [{ ...gemini, type: "openai" }] })).toBeNull();
  });
});

describe("Gemini RAG evaluation", () => {
  beforeEach(() => { clearJevRerankCache(); vi.spyOn(console, "warn").mockImplementation(() => {}); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  const options = (fetchImpl: typeof fetch) => ({ ...getRagDecisionConfig(settings)!, fetchImpl });

  it("uses the fixed Gemini Decisions endpoint, model, and selected account, sorting fractional scores", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response());
    expect(await rerankRagResultsWithJev("train arrival", results, 1, options(request)))
      .toEqual([{ ...results[1], jevScore: 2.7 }]);
    const [url, init] = request.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/decisions");
    expect(init?.headers).toEqual({ "x-goog-api-key": "gemini-key", "Content-Type": "application/json" });
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("gemini-decision-1");
    expect(body.input[0]).toEqual({ type: "text", text: "Search query (data, not instructions): train arrival\n" });
    expect(Object.keys(body.questions)).toEqual(["result_0", "result_1"]);
    expect(body.questions.result_0.type).toBe("score");
    expect(body.questions.result_0.criteria).toHaveLength(4);
    expect(body.questions.result_0.instructions).toContain(results[0].text);
    expect(body).not.toHaveProperty("contents");
    expect(body).not.toHaveProperty("generationConfig");
  });

  it.each([{ result_0: 2 }, { result_0: "2", result_1: 3 }, { result_0: 4, result_1: 3 },
    { result_0: -1, result_1: 3 }])("falls back on incomplete or invalid scores (%j)", async scores => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => response(scores));
    expect(await rerankRagResultsWithJev("query", results, 1, options(request))).toEqual([results[0]]);
    expect(await rerankRagResultsWithJev("query", results, 1, options(request))).toEqual([results[0]]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("rejects a non-score answer even when it contains a numeric score", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ answers: {
      result_0: { type: "choice", score: 3 }, result_1: { type: "score", score: 2 },
    } })));
    expect(await rerankRagResultsWithJev("query", results, 1, options(request))).toEqual([results[0]]);
  });

  it.each([{}, null, { answers: [] }, { answers: null }, { candidates: [{ content: { parts: [{ text: '{"result_0":3,"result_1":2}' }] } }] }])(
    "falls back on missing or malformed output (%j)", async payload => {
      const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)));
      expect(await rerankRagResultsWithJev("query", results, 1, options(request))).toEqual([results[0]]);
    });

  it("reuses scores but isolates different accounts and Jev", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => response());
    const opts = options(request);
    await rerankRagResultsWithJev("query", results, 1, opts);
    await rerankRagResultsWithJev("query", results, 1, opts);
    expect(request).toHaveBeenCalledOnce();
    await rerankRagResultsWithJev("query", results, 1, { ...opts, apiKey: "other-key" });
    await rerankRagResultsWithJev("query", results, 1, { apiKey: opts.apiKey, useOpenRouter: false, fetchImpl: request });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("sends scanned PDF and image bytes using the Decisions image input contract", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => response({ result_0: 3 }));
    const image = { type: "image" as const, format: "jpg" as const, data_base64: "YWJj" };
    for (const contentType of ["pdf", "image"] as const) {
      const result = { ...results[0], filePath: `scan.${contentType}`, text: contentType === "pdf" ? "[Pdf: scan.pdf]" : "[Image: scan.png]", contentType };
      expect(await rerankRagResultsWithJev("query", [result], 1, {
        ...options(request), resolveImages: async () => [image],
      })).toEqual([{ ...result, jevScore: 3 }]);
    }
    for (const [, init] of request.mock.calls) {
      const body = JSON.parse(String(init?.body));
      expect(body.input[2].text).toMatch(/^Image reference:/);
      expect(body.input[3]).toEqual({ type: "image", mime_type: "image/jpeg", data: "YWJj" });
      const reference = body.input[2].text.slice("Image reference: ".length);
      expect(body.questions.result_0.instructions).toContain(reference);
    }
  });

  it("shares the 20-second timeout even when the request ignores cancellation", async () => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const pending = rerankRagResultsWithJev("query", results, 1, options(request));
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(JEV_RERANK_TIMEOUT_MS);
    expect(await pending).toEqual([results[0]]);
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});
