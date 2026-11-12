import type { ApiProviderConfig, JevRagMode, LlmHubSettings } from "../types";

export const OPENROUTER_DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
export const JEV_MODEL = "~typesafe/jev-latest";
export const TYPESAFE_DECISIONS_URL = "https://api.typesafe.ai/v1/systemone";
export const TYPESAFE_JEV_MODEL = "jev-latest";

/** Explicit modes win; old stored flags are only a migration fallback. */
export function getJevRagMode(setting?: { jevMode?: JevRagMode | "filter"; jevRagFilterEnabled?: boolean } | null): JevRagMode {
  if (setting?.jevMode === "off") return "off";
  if (setting?.jevMode === "filter" || setting?.jevMode === "rerank") return "rerank";
  return setting?.jevRagFilterEnabled ? "rerank" : "off";
}

export function getOpenRouterApiKey(providers: ApiProviderConfig[]): string {
  return providers.find(provider => provider.type === "openrouter" && provider.apiKey.trim())?.apiKey.trim() ?? "";
}

/** Shared credentials for per-index reranking. An unconfigured Jev is inactive. */
export function getJevRagFilterConfig(
  settings: Pick<LlmHubSettings, "apiProviders" | "jevApiKey" | "jevUseOpenRouter">,
): { apiKey: string; useOpenRouter: boolean } | null {
  const openRouterKey = getOpenRouterApiKey(settings.apiProviders);
  const useOpenRouter = settings.jevUseOpenRouter && openRouterKey.length > 0;
  const apiKey = (useOpenRouter ? openRouterKey : settings.jevApiKey).trim();
  return apiKey ? { apiKey, useOpenRouter } : null;
}
