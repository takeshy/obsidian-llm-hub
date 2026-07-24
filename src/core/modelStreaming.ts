import { Platform } from "obsidian";
import type { LlmHubSettings, Message, ModelType, StreamChunk } from "../types";
import {
  getApiProviderId,
  getApiProviderModelName,
  getLocalLlmConfig,
  isApiProviderModel,
  isLocalLlmModel,
} from "../types";

/** Stream a text-only chat request to any configured model type. */
export async function* streamChatForModel(
  model: ModelType,
  messages: Message[],
  systemPrompt: string,
  settings: LlmHubSettings,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  if (isApiProviderModel(model)) {
    const providerId = getApiProviderId(model);
    const modelName = getApiProviderModelName(model);
    const providerConfig = settings.apiProviders.find(p => p.id === providerId && p.enabled && p.verified);
    if (!providerConfig) {
      yield { type: "error", error: `Provider not found for model: ${model}` };
      return;
    }

    if (providerConfig.type === "gemini") {
      const { GeminiClient } = await import("./gemini");
      const client = new GeminiClient(providerConfig.apiKey, modelName as ModelType, settings.proxyUrl, settings.proxyBypass);
      for await (const chunk of client.chatWithToolsStream(
        messages,
        [],
        systemPrompt,
        (_name: string, _args: Record<string, unknown>) => Promise.resolve({}),
      )) {
        if (signal?.aborted) return;
        yield chunk;
      }
    } else if (providerConfig.type === "anthropic") {
      const { anthropicChatWithToolsStream } = await import("./anthropicProvider");
      yield* anthropicChatWithToolsStream(
        providerConfig.baseUrl,
        providerConfig.apiKey,
        modelName,
        messages,
        [],
        systemPrompt,
        (_name: string, _args: Record<string, unknown>) => Promise.resolve({}),
        signal,
        undefined,
        settings.proxyUrl,
        settings.proxyBypass,
      );
    } else {
      const { openaiChatWithToolsStream } = await import("./openaiProvider");
      yield* openaiChatWithToolsStream(
        providerConfig.baseUrl,
        providerConfig.apiKey,
        modelName,
        messages,
        [],
        systemPrompt,
        (_name: string, _args: Record<string, unknown>) => Promise.resolve({}),
        signal,
        undefined,
        settings.proxyUrl,
        settings.proxyBypass,
      );
    }
  } else if (isLocalLlmModel(model) && !Platform.isMobile) {
    const llmConfig = getLocalLlmConfig(model, settings);
    if (!llmConfig) throw new Error(`Local LLM "${model}" is not configured`);
    const { localLlmChatStream } = await import("./localLlmProvider");
    yield* localLlmChatStream(llmConfig, messages, systemPrompt, signal);
  } else if (!Platform.isMobile) {
    const { AntigravityCliProvider, ClaudeCliProvider, CodexCliProvider } = await import("./cliProvider");
    const cliPaths: Record<string, string | undefined> = {
      "antigravity-cli": settings.cliConfig.geminiCliPath,
      "claude-cli": settings.cliConfig.claudeCliPath,
      "codex-cli": settings.cliConfig.codexCliPath,
    };
    const customPath = cliPaths[model];
    const provider = model === "claude-cli"
      ? new ClaudeCliProvider()
      : model === "codex-cli"
        ? new CodexCliProvider()
        : new AntigravityCliProvider(customPath);
    yield* provider.chatStream(messages, systemPrompt, "", signal);
  } else {
    yield { type: "error", error: `Unsupported model: ${model}` };
  }
}
