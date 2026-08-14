import { describe, expect, it } from "vitest";
import type { ApiProviderConfig, ModelType } from "../types";
import {
  continuationMatches,
  deduplicateWebSearchSources,
  formatWebSearchCitations,
  getEffectiveSearchSelection,
  getSearchSelectionForModel,
  getSlashCommandSearchSelection,
  modelSupportsWebSearch,
  normalizeSearchSelection,
  providerSupportsWebSearch,
  searchSelectionFromLegacy,
  searchSelectionFromWorkspace,
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
  it("allows Gemini and only official OpenAI/Anthropic/xAI endpoints", () => {
    expect(providerSupportsWebSearch(provider({ type: "gemini", baseUrl: "https://example.test" }), "gemini-3.7-flash")).toBe(true);
    expect(providerSupportsWebSearch(provider({ type: "gemini", baseUrl: "https://example.test" }), "gemini-3.1-flash-lite-image")).toBe(false);
    expect(providerSupportsWebSearch(provider({}), "gpt-5.4")).toBe(true);
    expect(providerSupportsWebSearch(provider({ baseUrl: "https://api.openai.com/" }), "gpt-5.4")).toBe(true);
    expect(providerSupportsWebSearch(provider({ baseUrl: "https://openai.proxy.test" }), "gpt-5.4")).toBe(false);
    expect(providerSupportsWebSearch(provider({ type: "anthropic", baseUrl: "https://api.anthropic.com/v1" }), "claude-sonnet-4-6")).toBe(true);
    expect(providerSupportsWebSearch(provider({ type: "anthropic", baseUrl: "https://claude.proxy.test" }), "claude-sonnet-4-6")).toBe(false);
    expect(providerSupportsWebSearch(provider({ type: "grok", baseUrl: "https://api.x.ai/v1" }), "grok-4.5")).toBe(true);
    expect(providerSupportsWebSearch(provider({ type: "grok", baseUrl: "https://xai.proxy.test" }), "grok-4.5")).toBe(false);
    expect(providerSupportsWebSearch(provider({ type: "grok", baseUrl: "https://api.x.ai" }), "grok-imagine-image")).toBe(false);
    expect(providerSupportsWebSearch(provider({}), "dall-e-3")).toBe(false);
    expect(providerSupportsWebSearch(provider({}), "gpt-image-1")).toBe(false);
  });

  it.each([
    ["openai", "gpt-5.6-sol"],
    ["anthropic", "claude-opus-5"],
    ["anthropic", "claude-opus-4-8"],
    ["anthropic", "claude-sonnet-5"],
    ["anthropic", "claude-fable-5"],
    ["anthropic", "claude-haiku-4-5"],
    ["grok", "grok-4.5"],
  ] as const)("enables search for official %s model %s", (type, model) => {
    const baseUrl = type === "openai"
      ? "https://api.openai.com"
      : type === "anthropic" ? "https://api.anthropic.com" : "https://api.x.ai";
    expect(providerSupportsWebSearch(provider({ type, baseUrl }), model)).toBe(true);
  });

  it("resolves model identifiers against enabled providers", () => {
    const config = provider({ id: "official" });
    expect(modelSupportsWebSearch("api:official:gpt-5.4" as ModelType, [config])).toBe(true);
    expect(modelSupportsWebSearch("api:missing:gpt-5.4" as ModelType, [config])).toBe(false);
    expect(modelSupportsWebSearch("codex-cli", [config])).toBe(false);
  });
});

describe("combined search selection", () => {
  it("migrates legacy slash-command values", () => {
    expect(searchSelectionFromLegacy(null)).toBeNull();
    expect(searchSelectionFromLegacy("")).toEqual({ webSearch: false, ragSetting: null });
    expect(searchSelectionFromLegacy("__websearch__")).toEqual({ webSearch: true, ragSetting: null });
    expect(searchSelectionFromLegacy("Research")).toEqual({ webSearch: false, ragSetting: "Research" });
  });

  it("prefers the new slash-command combination and preserves explicit current", () => {
    expect(getSlashCommandSearchSelection({
      searchSelection: { webSearch: true, ragSetting: "Research" },
      searchSetting: "Old index",
    })).toEqual({ webSearch: true, ragSetting: "Research" });
    expect(getSlashCommandSearchSelection({
      searchSelection: null,
      searchSetting: "Old index",
    })).toBeNull();
  });

  it("migrates workspace Web-only state and preserves combined state", () => {
    expect(searchSelectionFromWorkspace("__websearch__", false)).toEqual({
      webSearch: true, ragSetting: null,
    });
    expect(searchSelectionFromWorkspace("Research", true)).toEqual({
      webSearch: true, ragSetting: "Research",
    });
  });

  it("normalizes invalid values and resolves capabilities without erasing preferences", () => {
    expect(normalizeSearchSelection({ webSearch: true, ragSetting: "" })).toEqual({
      webSearch: true, ragSetting: null,
    });
    const remembered = { webSearch: true, ragSetting: "Research" };
    expect(getEffectiveSearchSelection(remembered, false, false)).toEqual({
      webSearch: false, ragSetting: null,
    });
    expect(remembered).toEqual({ webSearch: true, ragSetting: "Research" });
  });

  it("clears RAG for image models while preserving the independent Web Search setting", () => {
    expect(getSearchSelectionForModel(
      { webSearch: true, ragSetting: "Research" },
      "api:gemini:gemini-3.1-flash-image" as ModelType,
    )).toEqual({ webSearch: true, ragSetting: null });
    expect(getSearchSelectionForModel(
      { webSearch: true, ragSetting: "Research" },
      "api:gemini:gemini-3.7-flash" as ModelType,
    )).toEqual({ webSearch: true, ragSetting: "Research" });
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

  it("validates and deduplicates provider-linked sources", () => {
    expect(deduplicateWebSearchSources([
      { title: "First", url: "https://example.com/one" },
      { title: "Duplicate", url: "https://example.com/one" },
      { title: "Unsafe", url: "javascript:alert(1)" },
      { title: "Second", url: "http://example.com/two" },
    ])).toEqual([
      { title: "First", url: "https://example.com/one" },
      { title: "Second", url: "http://example.com/two" },
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
