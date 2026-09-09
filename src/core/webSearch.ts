import type {
  ApiProviderConfig,
  ModelType,
  ProviderContinuation,
  SearchSelection,
  WebSearchCitation,
  WebSearchSource,
} from "../types";
import { normalizeSearchSelection } from "obsidian-llm-hub-common/core";
import {
  getApiProviderId,
  getApiProviderModelName,
  isApiProviderModel,
  isImageGenerationModel,
} from "../types";

export const WEB_SEARCH_COST_PER_REQUEST = 10 / 1000;
export const XAI_WEB_SEARCH_COST_PER_REQUEST = 5 / 1000;

// Reading and combining the Web/RAG preferences is host-independent and lives in
// the shared library; only the model-capability rules below are this plugin's.
export {
  EMPTY_SEARCH_SELECTION,
  getEffectiveSearchSelection,
  getSlashCommandSearchSelection,
  normalizeSearchSelection,
  searchSelectionFromLegacy,
  searchSelectionFromWorkspace,
} from "obsidian-llm-hub-common/core";

/** Image generation requests cannot use a RAG index. */
export function getSearchSelectionForModel(
  selection: SearchSelection,
  model: ModelType,
): SearchSelection {
  const normalized = normalizeSearchSelection(selection);
  return isImageGenerationModel(model)
    ? { ...normalized, ragSetting: null }
    : normalized;
}

function normalizedHostname(baseUrl: string): string | null {
  try {
    return new URL(baseUrl).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

export function isOfficialOpenAiProvider(provider: ApiProviderConfig): boolean {
  return provider.type === "openai" && normalizedHostname(provider.baseUrl) === "api.openai.com";
}

export function isOfficialAnthropicProvider(provider: ApiProviderConfig): boolean {
  return provider.type === "anthropic" && normalizedHostname(provider.baseUrl) === "api.anthropic.com";
}

export function isOfficialGrokProvider(provider: ApiProviderConfig): boolean {
  return provider.type === "grok" && normalizedHostname(provider.baseUrl) === "api.x.ai";
}

export function getOfficialResponsesProvider(baseUrl: string): "openai" | "xai" | null {
  const hostname = normalizedHostname(baseUrl);
  if (hostname === "api.openai.com") return "openai";
  if (hostname === "api.x.ai") return "xai";
  return null;
}

export function providerSupportsWebSearch(provider: ApiProviderConfig, modelName: string): boolean {
  // Flash Lite Image generates images but does not support Google Search grounding.
  if (provider.type === "gemini") return !/^gemini-3\.1-flash-lite-image(?:-|$)/i.test(modelName);
  if (isOfficialOpenAiProvider(provider)) return !/^(?:dall-e|gpt-image)/i.test(modelName);
  if (isOfficialGrokProvider(provider)) return !/^grok-imagine-(?:image|video)/i.test(modelName);
  return isOfficialAnthropicProvider(provider);
}

export function modelSupportsWebSearch(
  model: ModelType,
  providers: ApiProviderConfig[],
): boolean {
  if (!isApiProviderModel(model)) return false;
  const provider = providers.find(p => p.id === getApiProviderId(model) && p.enabled && p.verified);
  if (!provider) return false;
  return providerSupportsWebSearch(provider, getApiProviderModelName(model) || provider.enabledModels[0] || "");
}

export function isSafeWebUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function continuationMatches(
  continuation: ProviderContinuation | undefined,
  provider: ProviderContinuation["provider"],
  baseUrl: string,
  model: string,
): continuation is ProviderContinuation {
  if (!continuation) return false;
  return continuation.provider === provider
    && continuation.baseUrl.replace(/\/+$/, "") === baseUrl.replace(/\/+$/, "")
    && continuation.model === model;
}

/** Add numbered Markdown citation links without disturbing provider offsets. */
export function formatWebSearchCitations(
  content: string,
  citations: WebSearchCitation[],
): { content: string; sources: WebSearchSource[] } {
  const valid = citations.filter(c =>
    isSafeWebUrl(c.url)
    && Number.isInteger(c.endIndex)
    && c.endIndex >= 0
    && c.endIndex <= content.length
  );

  const sources: WebSearchSource[] = [];
  const sourceNumber = new Map<string, number>();
  for (const citation of valid) {
    if (!sourceNumber.has(citation.url)) {
      sourceNumber.set(citation.url, sources.length + 1);
      sources.push({ title: citation.title || citation.url, url: citation.url });
    }
  }

  const markersByEnd = new Map<number, number[]>();
  for (const citation of valid) {
    const number = sourceNumber.get(citation.url);
    if (!number) continue;
    const markers = markersByEnd.get(citation.endIndex) ?? [];
    if (!markers.includes(number)) markers.push(number);
    markersByEnd.set(citation.endIndex, markers);
  }

  let formatted = content;
  const insertions = [...markersByEnd.entries()].sort(([a], [b]) => b - a);
  for (const [endIndex, numbers] of insertions) {
    const marker = numbers.map(number => {
      const source = sources[number - 1];
      return `[〔${number}〕](${source.url})`;
    }).join("");
    formatted = `${formatted.slice(0, endIndex)}${marker}${formatted.slice(endIndex)}`;
  }

  return { content: formatted, sources };
}

/** Validate and deduplicate already-linked provider sources in display order. */
export function deduplicateWebSearchSources(sources: WebSearchSource[]): WebSearchSource[] {
  const result: WebSearchSource[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    if (!isSafeWebUrl(source.url) || seen.has(source.url)) continue;
    seen.add(source.url);
    result.push({ title: source.title || source.url, url: source.url });
  }
  return result;
}
