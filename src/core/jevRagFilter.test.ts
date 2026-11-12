import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearJevRerankCache, JEV_RERANK_TIMEOUT_MS, rerankRagResultsWithJev } from "./jevRagRerank";
import { DEFAULT_SETTINGS, type ApiProviderConfig } from "../types";
import type { LocalRagSearchResult } from "./localRagStore";
import {
  filterRagResultsWithJev,
  getOpenRouterApiKey,
  getJevRagFilterConfig,
  JEV_MODEL,
  OPENROUTER_DECISIONS_URL,
  TYPESAFE_DECISIONS_URL,
  TYPESAFE_JEV_MODEL,
} from "./jevRagFilter";

const results: LocalRagSearchResult[] = [
  { filePath: "travel.md", text: "The train arrives at 09:10.", score: 0.8, chunkIndex: 0 },
  { filePath: "recipe.md", text: "Bake the bread for 30 minutes.", score: 0.7, chunkIndex: 0 },
];

describe("getOpenRouterApiKey", () => {
  it("finds an OpenRouter key independently of provider order", () => {
    const providers = [
      { type: "openai", apiKey: "openai-key" },
      { type: "openrouter", apiKey: "  router-key  " },
    ] as ApiProviderConfig[];
    expect(getOpenRouterApiKey(providers)).toBe("router-key");
  });
});

describe("getJevRagFilterConfig", () => {
  it("is inactive without credentials or with an unselected OpenRouter key", () => {
    expect(getJevRagFilterConfig(DEFAULT_SETTINGS)).toBeNull();
    expect(getJevRagFilterConfig({ ...DEFAULT_SETTINGS,
      apiProviders: [{ type: "openrouter", apiKey: "router-key" }] as ApiProviderConfig[],
    })).toBeNull();
  });

  it("uses the selected shared credentials", () => {
    expect(getJevRagFilterConfig({ ...DEFAULT_SETTINGS, jevApiKey: " direct-key " }))
      .toEqual({ apiKey: "direct-key", useOpenRouter: false });
    expect(getJevRagFilterConfig({ ...DEFAULT_SETTINGS, jevApiKey: "direct-key", jevUseOpenRouter: true,
      apiProviders: [{ type: "openrouter", apiKey: "router-key" }] as ApiProviderConfig[],
    })).toEqual({ apiKey: "router-key", useOpenRouter: true });
  });
});

describe("filterRagResultsWithJev", () => {
  it("uses the Decisions API and keeps only matching chunks", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({
      answers: {
        result_0: { type: "choice", choice: "keep" },
        result_1: { type: "choice", choice: "exclude" },
      },
    }), { status: 200 }));

    await expect(filterRagResultsWithJev("train arrival", results, "key", undefined, undefined, request))
      .resolves.toEqual([results[0]]);
    expect(request).toHaveBeenCalledOnce();
    const [url, init] = request.mock.calls[0];
    expect(url).toBe(OPENROUTER_DECISIONS_URL);
    expect(init?.headers).toMatchObject({ Authorization: "Bearer key" });
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe(JEV_MODEL);
    expect(Object.keys(body.questions)).toEqual(["result_0", "result_1"]);
  });

  it("requires an OpenRouter key", async () => {
    await expect(filterRagResultsWithJev("query", results, ""))
      .rejects.toThrow("OpenRouter API key is required");
  });

  it("sends direct Jev requests only to the official TypeSafe API", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({
      answers: {
        result_0: { choice: "keep" },
        result_1: { choice: "exclude" },
      },
    }), { status: 200 }));

    await filterRagResultsWithJev("query", results, "official-key", undefined, undefined, request, false);
    const [url, init] = request.mock.calls[0];
    expect(url).toBe(TYPESAFE_DECISIONS_URL);
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer official-key" });
    expect(JSON.parse(String(init?.body)).model).toBe(TYPESAFE_JEV_MODEL);
  });

  it("rejects incomplete decisions instead of leaking unfiltered results", async () => {
    const request = async () => new Response(JSON.stringify({
      answers: { result_0: { choice: "keep" } },
    }), { status: 200 });
    await expect(filterRagResultsWithJev("query", results, "key", undefined, undefined, request))
      .rejects.toThrow("omitted result_1");
  });
});

describe("Jev Score reranking", () => {
  beforeEach(() => {
    clearJevRerankCache();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  function response(scores: number[] = [1, 3]) {
    return new Response(JSON.stringify({ answers: Object.fromEntries(scores.map((score, index) => [
      `result_${index}`, { type: "score", score, confidence: 1 - index, probabilities: {}, legend: {} },
    ])) }));
  }
  const options = (fetchImpl: typeof fetch, useOpenRouter = true) => ({ apiKey: "key", useOpenRouter, fetchImpl });

  it.each([true, false])("reads fractional Score values, ignoring confidence, with the verified contract (OpenRouter: %s)", async useOpenRouter => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response([1.2, 2.7]));
    const ranked = await rerankRagResultsWithJev("train arrival", results, 1, options(request, useOpenRouter));
    expect(ranked).toEqual([{ ...results[1], jevScore: 2.7 }]);
    expect(results[1]).not.toHaveProperty("jevScore");
    const [url, init] = request.mock.calls[0];
    expect(url).toBe(useOpenRouter ? OPENROUTER_DECISIONS_URL : TYPESAFE_DECISIONS_URL);
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe(useOpenRouter ? JEV_MODEL : TYPESAFE_JEV_MODEL);
    expect(body.state).toBe("検索クエリ: train arrival");
    expect(body.questions.result_0.type).toBe("score");
    expect(body.questions.result_0.criteria).toHaveLength(4);
    expect(Object.keys(body.questions)).toEqual(["result_0", "result_1"]);
    expect(body.questions.result_0.instructions).not.toContain("train arrival");
  });

  it("retains the original ranking for ties and applies Top K after scoring", async () => {
    const third = { ...results[0], filePath: "third.md" };
    const request = vi.fn<typeof fetch>().mockResolvedValue(response([2, 2, 3]));
    expect(await rerankRagResultsWithJev("query", [...results, third], 2, options(request))).toEqual([
      { ...third, jevScore: 3 }, { ...results[0], jevScore: 2 },
    ]);
  });

  it.each([
    { answers: { result_0: { type: "score", score: 2 } } },
    { answers: { result_0: { type: "score", score: "2" } } },
    { answers: { result_0: { type: "score", score: -1 } } },
    { answers: { result_0: { type: "score", score: 4 } } },
    { answers: { result_0: { type: "choice", score: 3 } } },
    {}, null,
  ])("falls back to the original topK on missing, invalid or incomplete scores: %j", async payload => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)));
    expect(await rerankRagResultsWithJev("query", results, 1, options(request))).toEqual([results[0]]);
    expect((await rerankRagResultsWithJev("query", results, 1, options(request)))[0]).toBe(results[0]);
    expect(request).toHaveBeenCalledTimes(2); // Invalid responses never populate the cache.
  });

  it("falls back on HTTP failures, JSON failures and rejected fetches", async () => {
    for (const fetchImpl of [
      vi.fn<typeof fetch>().mockResolvedValue(new Response("failed", { status: 503 })),
      vi.fn<typeof fetch>().mockResolvedValue(new Response("not JSON")),
      vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
    ]) {
      expect(await rerankRagResultsWithJev("query", results, 1, options(fetchImpl))).toEqual([results[0]]);
    }
  });

  it.each(["1", "date"])("honors 429 Retry-After (%s) before retrying", async retry => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T00:00:00Z"));
    const retryAt = Date.now() + 1_000;
    let firstRequestAt = 0;
    const request = vi.fn<typeof fetch>()
      .mockImplementationOnce(async () => {
        firstRequestAt = Date.now();
        return new Response("rate limited", { status: 429, headers: {
          "retry-after": retry === "date" ? new Date(retryAt).toUTCString() : retry,
        } });
      })
      .mockResolvedValueOnce(response());
    const pending = rerankRagResultsWithJev("query", results, 1, options(request));
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    const target = retry === "date" ? retryAt : firstRequestAt + 1_000;
    await vi.advanceTimersByTimeAsync(Math.max(0, target - Date.now() - 1));
    expect(request).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending)[0].filePath).toBe("recipe.md");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])("bounds the entire operation to 20s, even if fetch ignores abort or Retry-After is longer (429: %s)", async rateLimited => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>();
    if (rateLimited) request.mockResolvedValue(new Response("rate limited", { status: 429, headers: { "retry-after": "60" } }));
    else request.mockImplementation(() => new Promise(() => {}));
    const pending = rerankRagResultsWithJev("query", results, 1, options(request));
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(JEV_RERANK_TIMEOUT_MS);
    expect(await pending).toEqual([results[0]]);
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("caches by query, actual text, path/page, model and account without retaining raw content in keys", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => response());
    const opts = options(request);
    await rerankRagResultsWithJev("query", results, 2, opts);
    await rerankRagResultsWithJev("query", results.map(r => ({ ...r })), 2, opts);
    expect(request).toHaveBeenCalledOnce();
    await rerankRagResultsWithJev("different", results, 2, opts);
    expect(request).toHaveBeenCalledTimes(2);
    await rerankRagResultsWithJev("query", [{ ...results[0], text: "changed" }, results[1]], 2, opts);
    expect(request).toHaveBeenCalledTimes(3);
    expect(Object.keys(JSON.parse(String(request.mock.calls[2][1]?.body)).questions)).toEqual(["result_0"]);
    await rerankRagResultsWithJev("query", [{ ...results[0], pageLabel: "pages 2-3" }, results[1]], 2, opts);
    await rerankRagResultsWithJev("query", [{ ...results[0], filePath: "renamed.md" }, results[1]], 2, opts);
    await rerankRagResultsWithJev("query", results, 2, options(request, false));
    await rerankRagResultsWithJev("query", results, 2, { ...opts, apiKey: "different-account" });
    expect(request).toHaveBeenCalledTimes(7);
  });

  it("batches extracted PDF text with text chunks, and scores complete image chunks individually", async () => {
    const pdf = { ...results[0], text: "[Pdf: scan.pdf (pages 2-3 of 4)]", filePath: "scan.pdf", contentType: "pdf" as const, pageLabel: "pages 2-3 of 4" };
    const image = { ...results[1], filePath: "photo.png", text: "[Image: photo.png]", contentType: "image" as const };
    const request = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ answers: Object.fromEntries(Object.keys(body.questions).map(key => [key, { type: "score", score: key === "result_0" ? 3 : 1 }])) }));
    });
    const images = [{ type: "image" as const, format: "jpg" as const, data_base64: "YWJj" }];
    const opts = { ...options(request), resolvePdfText: vi.fn().mockResolvedValue("The train timetable."), resolveImages: vi.fn().mockResolvedValue(images) };
    const ranked = await rerankRagResultsWithJev("query", [pdf, image, results[0]], 2, opts);
    expect(ranked[0].filePath).toBe("scan.pdf");
    expect(request).toHaveBeenCalledTimes(2);
    const bodies = request.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(Object.keys(bodies[0].questions)).toEqual(["result_1"]);
    expect(Object.keys(bodies[0].assets)).toHaveLength(1);
    expect(Object.keys(bodies[1].questions)).toEqual(["result_0", "result_2"]);
    expect(bodies[1].questions.result_0.instructions).toContain("The train timetable.");
    await rerankRagResultsWithJev("query", [pdf, image, results[0]], 2, opts);
    expect(request).toHaveBeenCalledTimes(2); // Random image placeholders do not break the content cache.
  });

  it("expires cached scores ten minutes after evaluation even when repeatedly read", async () => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockImplementation(async () => response());
    await rerankRagResultsWithJev("query", results, 2, options(request));
    await vi.advanceTimersByTimeAsync(9 * 60_000);
    await rerankRagResultsWithJev("query", results, 2, options(request));
    expect(request).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(61_000);
    await rerankRagResultsWithJev("query", results, 2, options(request));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("falls back when PDF content cannot be resolved and never scores the label itself", async () => {
    const request = vi.fn<typeof fetch>();
    const pdf = { ...results[0], contentType: "pdf" as const, text: "[Pdf: scan.pdf]" };
    expect(await rerankRagResultsWithJev("query", [pdf, results[1]], 1, {
      ...options(request), resolvePdfText: async () => null, resolveImages: async () => null,
    })).toEqual([pdf]);
    expect(request).not.toHaveBeenCalled();
  });
});
