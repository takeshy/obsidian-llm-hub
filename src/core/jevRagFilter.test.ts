import { describe, expect, it, vi } from "vitest";
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
