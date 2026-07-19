import { describe, expect, it } from "vitest";
import type { ApiProviderConfig, ModelType } from "../types";
import {
  continuationMatches,
  formatWebSearchCitations,
  modelSupportsWebSearch,
  providerSupportsWebSearch,
} from "./webSearch";

function provider(overrides: Partial<ApiProviderConfig>): ApiProviderConfig {
  return {
    id: "provider",
    name: "Provider",
    type: "openai",
    baseUrl: "https://api.openai.com",
    apiKey: "key",
    enabledModels: ["gpt-5.4"],
    availableModels: ["gpt-5.4"],
    verified: true,
    enabled: true,
    ...overrides,
  };
}

describe("web search capability", () => {
  it("allows Gemini and only official OpenAI/Anthropic endpoints", () => {
    expect(providerSupportsWebSearch(provider({ type: "gemini", baseUrl: "https://example.test" }), "gemini-3.5-flash")).toBe(true);
    expect(providerSupportsWebSearch(provider({}), "gpt-5.4")).toBe(true);
    expect(providerSupportsWebSearch(provider({ baseUrl: "https://api.openai.com/" }), "gpt-5.4")).toBe(true);
    expect(providerSupportsWebSearch(provider({ baseUrl: "https://openai.proxy.test" }), "gpt-5.4")).toBe(false);
    expect(providerSupportsWebSearch(provider({ type: "anthropic", baseUrl: "https://api.anthropic.com/v1" }), "claude-sonnet-4-6")).toBe(true);
    expect(providerSupportsWebSearch(provider({ type: "anthropic", baseUrl: "https://claude.proxy.test" }), "claude-sonnet-4-6")).toBe(false);
    expect(providerSupportsWebSearch(provider({}), "dall-e-3")).toBe(false);
    expect(providerSupportsWebSearch(provider({}), "gpt-image-1")).toBe(false);
  });

  it.each([
    ["openai", "gpt-5.6-sol"],
    ["anthropic", "claude-opus-4-8"],
    ["anthropic", "claude-sonnet-5"],
    ["anthropic", "claude-fable-5"],
    ["anthropic", "claude-haiku-4-5"],
  ] as const)("enables search for official %s model %s", (type, model) => {
    const baseUrl = type === "openai" ? "https://api.openai.com" : "https://api.anthropic.com";
    expect(providerSupportsWebSearch(provider({ type, baseUrl }), model)).toBe(true);
  });

  it("resolves model identifiers against enabled providers", () => {
    const config = provider({ id: "official" });
    expect(modelSupportsWebSearch("api:official:gpt-5.4" as ModelType, [config])).toBe(true);
    expect(modelSupportsWebSearch("api:missing:gpt-5.4" as ModelType, [config])).toBe(false);
    expect(modelSupportsWebSearch("codex-cli", [config])).toBe(false);
  });
});

describe("formatWebSearchCitations", () => {
  it("inserts numbered links and deduplicates sources in citation order", () => {
    const result = formatWebSearchCitations("Alpha beta.", [
      { title: "A", url: "https://a.example", startIndex: 0, endIndex: 5 },
      { title: "B", url: "https://b.example", startIndex: 0, endIndex: 5 },
      { title: "A duplicate", url: "https://a.example", startIndex: 6, endIndex: 10 },
    ]);

    expect(result.content).toBe("Alpha[〔1〕](https://a.example)[〔2〕](https://b.example) beta[〔1〕](https://a.example).");
    expect(result.sources).toEqual([
      { title: "A", url: "https://a.example" },
      { title: "B", url: "https://b.example" },
    ]);
  });

  it("rejects unsafe URLs and invalid offsets", () => {
    const result = formatWebSearchCitations("Answer", [
      { title: "Bad", url: "javascript:alert(1)", startIndex: 0, endIndex: 6 },
      { title: "Past end", url: "https://safe.example", startIndex: 0, endIndex: 99 },
    ]);
    expect(result).toEqual({ content: "Answer", sources: [] });
  });
});

describe("continuationMatches", () => {
  it("requires provider, normalized endpoint, and model equality", () => {
    const continuation = {
      provider: "openai" as const,
      baseUrl: "https://api.openai.com",
      model: "gpt-5.4",
      items: [],
    };
    expect(continuationMatches(continuation, "openai", "https://api.openai.com/", "gpt-5.4")).toBe(true);
    expect(continuationMatches(continuation, "anthropic", "https://api.openai.com", "gpt-5.4")).toBe(false);
    expect(continuationMatches(continuation, "openai", "https://api.openai.com", "gpt-5.4-mini")).toBe(false);
  });
});
