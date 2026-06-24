// Headless `.base` generation: builds a system prompt from the built-in `base`
// skill and streams a single completion from the user's selected model, then
// returns the cleaned YAML. Provider dispatch mirrors AIWorkflowModal's
// streamForWorkflow (CLI / Gemini / Anthropic / OpenAI-compatible).

import type { LlmHubPlugin } from "src/plugin";
import { AntigravityCliProvider, CodexCliProvider } from "src/core/cliProvider";
import { GeminiClient } from "src/core/gemini";
import { openaiChatWithToolsStream } from "src/core/openaiProvider";
import { anthropicChatWithToolsStream } from "src/core/anthropicProvider";
import { loadBuiltinSkill, builtinFolderPath } from "src/core/builtinSkills";
import {
  DEFAULT_CLI_CONFIG,
  getGeminiApiKey,
  isApiProviderModel,
  getApiProviderId,
  getApiProviderModelName,
  type ModelType,
  type Message,
  type StreamChunk,
} from "src/types";

/** Build the system prompt for `.base` generation from the built-in skill. */
export function buildBaseSystemPrompt(): string {
  const skill = loadBuiltinSkill(builtinFolderPath("base"));
  const reference = skill
    ? `${skill.instructions}\n\n${skill.references.join("\n\n")}`
    : "";
  return [
    "You are an expert at authoring Obsidian Bases (`.base`) files.",
    "Produce a single valid `.base` YAML document that satisfies the user's request.",
    "Output ONLY the YAML — no prose, no explanation, and no Markdown code fences.",
    "",
    reference,
  ].join("\n");
}

/** Strip a wrapping ```yaml / ``` code fence if the model added one. */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:ya?ml)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);
  return (fence ? fence[1] : trimmed).trim();
}

async function collectText(stream: AsyncGenerator<StreamChunk>): Promise<string> {
  let out = "";
  for await (const chunk of stream) {
    if (chunk.type === "text" && chunk.content) out += chunk.content;
    else if (chunk.type === "error") throw new Error(chunk.error || "Generation failed");
  }
  return out;
}

/**
 * Generate `.base` YAML for the given request. `mode` only affects how the user
 * prompt is framed; `currentYaml` is included for edits so the model revises in
 * place. Returns cleaned YAML (no fences).
 */
export async function generateBaseYaml(
  plugin: LlmHubPlugin,
  model: ModelType,
  request: string,
  currentYaml?: string,
): Promise<string> {
  const systemPrompt = buildBaseSystemPrompt();

  const userPrompt = currentYaml
    ? `Revise the following \`.base\` file according to this request:\n\n${request}\n\nCurrent \`.base\` content:\n\`\`\`yaml\n${currentYaml}\n\`\`\``
    : `Create a \`.base\` file for this request:\n\n${request}`;

  const userMessages: Message[] = [{ role: "user", content: userPrompt, timestamp: Date.now() }];
  const abort = new AbortController();

  const raw = await collectText(streamFor(plugin, model, userMessages, systemPrompt, abort));
  const yaml = stripCodeFence(raw);
  if (!yaml) throw new Error("The model returned an empty result.");
  return yaml;
}

function streamFor(
  plugin: LlmHubPlugin,
  selectedModel: ModelType,
  userMessages: Message[],
  systemPrompt: string,
  abort: AbortController,
): AsyncGenerator<StreamChunk> {
  // CLI models
  if (selectedModel === "antigravity-cli" || selectedModel === "codex-cli") {
    const cliConfig = plugin.settings.cliConfig || DEFAULT_CLI_CONFIG;
    let provider: AntigravityCliProvider | CodexCliProvider;
    if (selectedModel === "codex-cli") {
      if (!cliConfig.codexCliVerified) throw new Error("Codex CLI is not available. Verify it in settings.");
      provider = new CodexCliProvider();
    } else {
      if (!cliConfig.cliVerified) throw new Error("Antigravity CLI is not available. Verify it in settings.");
      provider = new AntigravityCliProvider(cliConfig.geminiCliPath);
    }
    const vaultBasePath =
      (plugin.app.vault.adapter as unknown as { basePath?: string }).basePath || ".";
    return provider.chatStream(userMessages, systemPrompt, vaultBasePath);
  }

  const providerId = isApiProviderModel(selectedModel) ? getApiProviderId(selectedModel) : null;
  const providerConfig = providerId
    ? plugin.settings.apiProviders.find((p) => p.id === providerId && p.enabled && p.verified)
    : null;
  const resolvedModelName = isApiProviderModel(selectedModel)
    ? getApiProviderModelName(selectedModel) || providerConfig?.enabledModels[0] || ""
    : selectedModel;

  if (providerConfig?.type === "gemini") {
    const apiKey = providerConfig.apiKey || getGeminiApiKey(plugin.settings);
    if (!apiKey) throw new Error("Gemini API key is not configured.");
    const client = new GeminiClient(apiKey, resolvedModelName as ModelType, plugin.settings.proxyUrl, plugin.settings.proxyBypass);
    return client.generateWorkflowStream(userMessages, systemPrompt, null);
  }

  if (providerConfig?.type === "anthropic") {
    const noop = () => Promise.resolve({});
    return anthropicChatWithToolsStream(
      providerConfig.baseUrl, providerConfig.apiKey,
      resolvedModelName, userMessages, [],
      systemPrompt, noop, abort.signal, true,
      plugin.settings.proxyUrl, plugin.settings.proxyBypass,
    );
  }

  if (providerConfig) {
    const noop = () => Promise.resolve({});
    return openaiChatWithToolsStream(
      providerConfig.baseUrl, providerConfig.apiKey,
      resolvedModelName, userMessages, [],
      systemPrompt, noop, abort.signal, true,
      plugin.settings.proxyUrl, plugin.settings.proxyBypass,
    );
  }

  // Fallback: Gemini key from settings.
  const apiKey = getGeminiApiKey(plugin.settings);
  if (!apiKey) throw new Error("No model is configured. Add an API provider or CLI in settings.");
  const client = new GeminiClient(apiKey, resolvedModelName as ModelType, plugin.settings.proxyUrl, plugin.settings.proxyBypass);
  return client.generateWorkflowStream(userMessages, systemPrompt, null);
}
