import { getApiProviderId, type LlmHubSettings } from "../types";
import { getJevRagFilterConfig } from "./jevRagFilter";
import { GEMINI_DECISION_MODEL } from "./geminiRagDecision";

export type RagDecisionSettings = Pick<LlmHubSettings, "apiProviders" | "jevApiKey" | "jevUseOpenRouter">
  & Partial<Pick<LlmHubSettings, "ragDecisionModel">>;

/** Gemini evaluation requires only a saved key, independently of chat settings. */
export function getRagDecisionModels(settings: RagDecisionSettings): { value: string; label: string }[] {
  const models = getJevRagFilterConfig(settings) ? [{ value: "jev", label: "Jev" }] : [];
  for (const provider of settings.apiProviders) {
    if (provider.type !== "gemini" || !provider.apiKey.trim()) continue;
    models.push({ value: `api:${provider.id}:${GEMINI_DECISION_MODEL}`, label: `${provider.name} / ${GEMINI_DECISION_MODEL}` });
  }
  return models;
}

/** Keep the selected account when loading an earlier Gemini chat-model choice. */
export function getRagDecisionModel(settings: RagDecisionSettings): string {
  const selected = settings.ragDecisionModel || "jev";
  return selected.startsWith("api:") ? `api:${getApiProviderId(selected)}:${GEMINI_DECISION_MODEL}` : selected;
}

/** Missing credentials deactivate evaluation without switching services. */
export function getRagDecisionConfig(settings: RagDecisionSettings): {
  apiKey: string;
  useOpenRouter: boolean;
  useGemini?: boolean;
} | null {
  const selected = getRagDecisionModel(settings);
  if (selected === "jev") return getJevRagFilterConfig(settings);
  if (!getRagDecisionModels(settings).some(model => model.value === selected)) return null;
  const provider = settings.apiProviders.find(provider => provider.id === getApiProviderId(selected))!;
  return {
    apiKey: provider.apiKey.trim(), useOpenRouter: false,
    useGemini: true,
  };
}
