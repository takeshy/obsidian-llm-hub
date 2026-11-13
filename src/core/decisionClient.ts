import { Platform } from "obsidian";
import { geminiCorsFetch, requestDecision, requestDecisions, type DecisionDefinition, type DecisionQuestions, type DecisionResult, type DecisionRequestConfig } from "obsidian-llm-hub-common/core";
import { getRagDecisionConfig, type RagDecisionSettings } from "./ragDecision";
import { createNodeFetch, createProxyFetch } from "./proxyFetch";

export { DECISION_TIMEOUT_MS } from "obsidian-llm-hub-common/core";

/** Resolve this host's configured account, then use the shared decision contract. */
export async function evaluateDecision(
  prompt: string,
  input: string,
  settings: RagDecisionSettings & { proxyUrl?: string; proxyBypass?: string },
  options: { model?: string; signal?: AbortSignal; fetchImpl?: typeof fetch; definition?: DecisionDefinition; questions?: DecisionQuestions } = {},
): Promise<DecisionResult> {
  options.signal?.throwIfAborted();
  if (!options.questions && !prompt.trim()) throw new Error("Decision instructions are required");
  const config = getRagDecisionConfig({ ...settings, ragDecisionModel: options.model?.trim() || settings.ragDecisionModel });
  if (!config) throw new Error("Decision model is not configured. Register a Jev or Gemini API key and select a decision model in settings.");
  const requestConfig: DecisionRequestConfig = {
    provider: config.useGemini ? "gemini" : config.useOpenRouter ? "openrouter" : "jev",
    apiKey: config.apiKey,
    fetchImpl: options.fetchImpl ?? (settings.proxyUrl?.trim() ? createProxyFetch(settings.proxyUrl, settings.proxyBypass)
      : Platform.isMobile ? geminiCorsFetch : createNodeFetch()),
  };
  return options.questions ? requestDecisions(input, options.questions, requestConfig, options.signal)
    : requestDecision(prompt, input, requestConfig, options.definition, options.signal);
}
