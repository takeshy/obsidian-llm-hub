import { AntigravityCliProvider, CodexCliProvider } from "src/core/cliProvider";
import { GeminiClient } from "src/core/gemini";
import { openaiChatWithToolsStream } from "src/core/openaiProvider";
import { anthropicChatWithToolsStream } from "src/core/anthropicProvider";
import { DEFAULT_CLI_CONFIG, getGeminiApiKey, isApiProviderModel, getApiProviderId, getApiProviderModelName, type ModelType, type Attachment } from "src/types";
import type { LlmHubPlugin } from "src/plugin";
import { t } from "src/i18n";
import type { WorkflowChatChunk, WorkflowChatRequest } from "obsidian-llm-hub-common/workflow";

/**
 * Runs a workflow generation prompt against whichever provider the chosen model belongs to.
 * This is the plugin's half of WorkflowHost: the shared modal knows nothing about providers.
 */
export async function* streamWorkflowChat(
  plugin: LlmHubPlugin,
  request: WorkflowChatRequest,
): AsyncGenerator<WorkflowChatChunk> {
  // Workflow generation only cares about prose, reasoning and the final tally.
  for await (const chunk of streamProviderChat(plugin, request)) {
    if (chunk.type === "text" || chunk.type === "thinking" || chunk.type === "done" || chunk.type === "error") {
      yield { type: chunk.type, content: chunk.content, usage: chunk.usage, error: chunk.error };
    }
  }
}

async function* streamProviderChat(
  plugin: LlmHubPlugin,
  request: WorkflowChatRequest,
): AsyncGenerator<import("src/types").StreamChunk> {
    const selectedModel = (request.model || plugin.getSelectedModel()) as ModelType;
    const isCliModel = selectedModel === "antigravity-cli" || selectedModel === "codex-cli";
    const { systemPrompt, userPrompt, traceId } = request;
    const attachments = request.attachments as Attachment[] | undefined;
    const abortController = { signal: request.abortSignal } as AbortController;
    const userMessages: import("src/types").Message[] = [{
      role: "user",
      content: userPrompt,
      timestamp: Date.now(),
      attachments,
    }];

    if (isCliModel) {
      const cliConfig = plugin.settings.cliConfig || DEFAULT_CLI_CONFIG;
      const isCodexCli = selectedModel === "codex-cli";

      let provider: AntigravityCliProvider | CodexCliProvider;
      if (isCodexCli) {
        if (!cliConfig.codexCliVerified) {
          throw new Error("Codex CLI is not available. Please verify it in settings.");
        }
        provider = new CodexCliProvider(cliConfig.codexCliModel, cliConfig.codexCliPath, undefined, cliConfig.codexCliReasoningEffort);
      } else {
        if (!cliConfig.cliVerified) {
          throw new Error("Antigravity CLI is not available. Please verify it in settings.");
        }
        provider = new AntigravityCliProvider(cliConfig.geminiCliPath);
      }

      const vaultBasePath =
        (plugin.app.vault.adapter as unknown as { basePath?: string }).basePath || ".";
      const cliSystemPrompt = `${systemPrompt}\n\nNote: You are running in CLI mode with limited capabilities. You can read and search vault files, but cannot modify them.`;
      yield* provider.chatStream(userMessages, cliSystemPrompt, vaultBasePath);
      return;
    }

    const providerId = isApiProviderModel(selectedModel) ? getApiProviderId(selectedModel) : null;
    const providerConfig = providerId
      ? plugin.settings.apiProviders.find(p => p.id === providerId && p.enabled && p.verified)
      : null;
    const resolvedModelName = isApiProviderModel(selectedModel)
      ? (getApiProviderModelName(selectedModel) || providerConfig?.enabledModels[0] || "")
      : selectedModel;

    if (providerConfig?.type === "gemini") {
      const geminiApiKey = providerConfig.apiKey || getGeminiApiKey(plugin.settings);
      if (!geminiApiKey) {
        throw new Error(t("aiWorkflow.apiKeyNotConfigured"));
      }
      const client = new GeminiClient(geminiApiKey, resolvedModelName as ModelType, plugin.settings.proxyUrl, plugin.settings.proxyBypass);
      yield* client.generateWorkflowStream(userMessages, systemPrompt, traceId);
      return;
    }

    if (providerConfig?.type === "anthropic") {
      const noopToolExecutor = () => Promise.resolve({});
      yield* anthropicChatWithToolsStream(
        providerConfig.baseUrl, providerConfig.apiKey,
        resolvedModelName, userMessages, [],
        systemPrompt, noopToolExecutor, abortController.signal,
        true,
        plugin.settings.proxyUrl, plugin.settings.proxyBypass,
      );
      return;
    }

    if (providerConfig) {
      // OpenAI-compatible providers (OpenRouter, Grok, custom, openai)
      const noopToolExecutor = () => Promise.resolve({});
      yield* openaiChatWithToolsStream(
        providerConfig.baseUrl, providerConfig.apiKey,
        resolvedModelName, userMessages, [],
        systemPrompt, noopToolExecutor, abortController.signal,
        true,
        plugin.settings.proxyUrl, plugin.settings.proxyBypass,
      );
      return;
    }

    // Fallback: try Gemini API key from settings
    const geminiApiKey = getGeminiApiKey(plugin.settings);
    if (!geminiApiKey) {
      throw new Error(t("aiWorkflow.apiKeyNotConfigured"));
    }
    const client = new GeminiClient(geminiApiKey, resolvedModelName as ModelType, plugin.settings.proxyUrl, plugin.settings.proxyBypass);
    yield* client.generateWorkflowStream(userMessages, systemPrompt, traceId);
  }

  /**
   * Phase 1: Planning - produce a structured plan before generation.
   * Returns the plan text, or undefined if planning fails (non-fatal).
   */
