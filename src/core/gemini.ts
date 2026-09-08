import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  type Content,
  type GenerateContentParameters,
  type CreateChatParameters,
  type Tool,
  type SafetySetting,
  type Interactions,
} from "@google/genai";
import {
  DEFAULT_SETTINGS,
  type Message,
  type ToolDefinition,
  type StreamChunk,
  type ModelType,
  type ReasoningEffort,
} from "src/types";
import { tracing } from "src/core/tracingHooks";
import {
  buildGeminiGenerateContentTools,
  buildGeminiHistoryReplayInput,
  buildGeminiInteractionTools,
  buildGeminiInteractionInput,
  buildGeminiRagRequest,
  buildGeminiThinkingConfig,
  resolveGeminiThinkingLevel,
  extractGeminiRagContexts,
  formatError,
  geminiCorsFetch as corsFetch,
  messagesToGeminiContents,
  runGeminiInteractions,
  GeminiGenerationClient,
  selectGeminiGenerationTools,
  selectGeminiInteractionTools,
  type GeminiToolMode,
  runGeminiGenerateContentTools,
} from "obsidian-llm-hub-common/core";
import { createProxyFetch } from "./proxyFetch";

// Default safety settings per Gemini best practices
// Using BLOCK_MEDIUM_AND_ABOVE as a balanced default
const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Function call limit options
export interface FunctionCallLimitOptions {
  maxFunctionCalls?: number;           // 最大function call回数 (default: 20)
  functionCallWarningThreshold?: number; // 残りこの回数で警告 (default: 5)
}

export interface ChatWithToolsOptions {
  ragTopK?: number;
  functionCallLimits?: FunctionCallLimitOptions;
  disableTools?: boolean;
  enableThinking?: boolean;
  reasoningEffort?: ReasoningEffort;
  traceId?: string | null;
  previousInteractionId?: string | null;  // For Interactions API conversation chaining
}

export { buildGeminiThinkingConfig };

/**
 * Patch a GoogleGenAI instance so all SDK HTTP requests go through the proxy.
 * The SDK's ApiClient.apiCall uses global `fetch`; we override it to use our
 * CONNECT-tunnel fetch instead.
 */
export function patchGeminiProxy(ai: GoogleGenAI, proxyUrl: string, proxyBypass?: string): void {
  const proxyFetch = createProxyFetch(proxyUrl, proxyBypass);
  try {
    const client = (ai as unknown as { apiClient: { apiCall: (url: string, init: RequestInit) => Promise<Response> } }).apiClient;
    if (client) {
      client.apiCall = (url: string, init: RequestInit) => proxyFetch(url, init);
    } else {
      console.warn("[LLM Hub] Failed to patch Gemini SDK for proxy: apiClient not found. Proxy may not be applied.");
    }
  } catch (e) {
    console.warn("[LLM Hub] Failed to patch Gemini SDK for proxy:", e);
  }
}

export class GeminiClient extends GeminiGenerationClient<ModelType> {
  private ai: GoogleGenAI;

  constructor(apiKey: string, model: ModelType = "gemini-3.8-flash" as ModelType, proxyUrl?: string, proxyBypass?: string) {
    const ai = new GoogleGenAI({ apiKey });
    super(model, {
      generate: request => ai.models.generateContent(request as GenerateContentParameters),
      stream: request => ai.models.generateContentStream(request as GenerateContentParameters),
      chat: request => ai.chats.create(request as CreateChatParameters),
      createResearch: request => ai.interactions.create(request),
      getResearch: id => ai.interactions.get(id),
      delay: milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds)),
      safetySettings: DEFAULT_SAFETY_SETTINGS,
      supportsThinking: () => true,
    });
    this.ai = ai;

    // Proxy: tunnel all SDK requests through HTTP CONNECT proxy
    if (proxyUrl) {
      patchGeminiProxy(this.ai, proxyUrl, proxyBypass);
    }

    // Patch Interactions API client to bypass CORS.
    // The Interactions API endpoint doesn't return CORS headers, so browser/Electron
    // fetch blocks the request. Desktop uses Node.js https, mobile uses Obsidian's requestUrl.
    // When a proxy is configured, use the proxy fetch instead so Interactions traffic
    // also goes through the CONNECT tunnel.
    try {
      const interactions = this.ai.interactions;
      const client = (interactions as unknown as { _client: { fetch: typeof fetch } })._client;
      if (client) {
        client.fetch = proxyUrl
          ? createProxyFetch(proxyUrl, proxyBypass)
          : corsFetch;
      }
    } catch {
      // Fallback: global fetch
    }
  }

  private getInteractionsModel(hasFunctionTools: boolean): ModelType {
    const modelName = this.model as string;
    if (modelName === "gemini-3.1-pro-preview" && hasFunctionTools) {
      return "gemini-3.1-pro-preview-customtools" as ModelType;
    }
    return this.model;
  }

  // Build thinking config based on model capabilities (shared across streaming methods)
  private buildThinkingConfig(enableThinking?: boolean, reasoningEffort?: ReasoningEffort): Record<string, unknown> | undefined {
    return buildGeminiThinkingConfig(this.model, enableThinking, reasoningEffort);
  }

  private messagesToContents(messages: Message[]): Content[] {
    return messagesToGeminiContents(messages) as Content[];
  }

  // Convert tool definitions to Interactions API format (Tool_2[])
  // Each function is an individual tool with { type: 'function', name, description, parameters }
  private toolsToInteractionsFormat(
    tools: ToolDefinition[],
    ragStoreIds?: string[],
    ragTopK?: number,
    webSearchEnabled?: boolean,
  ): Interactions.Tool[] {
    return buildGeminiInteractionTools(tools, {
      ragStoreIds,
      ragTopK,
      webSearchEnabled,
    }) as Interactions.Tool[];
  }

  // Retrieve RAG context via the generateContent API (file_search tool).
  // The Interactions API does not support the file_search tool (returns 501
  // not_implemented), so RAG retrieval is done as a pre-processing step using
  // the generateContent API. The retrieved contexts are injected into the
  // system prompt for the subsequent Interactions API call, preserving both
  // RAG and function calling capabilities.
  private async retrieveRagContext(
    userMessage: string,
    ragStoreIds: string[],
    topK: number,
    attachments?: Message["attachments"],
  ): Promise<{ sources: string[]; contexts: Array<{ source: string; text: string }> }> {
    const { parts, tools } = buildGeminiRagRequest(userMessage, ragStoreIds, topK, undefined, attachments);

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [{ role: "user", parts }],
      config: {
        tools,
        safetySettings: DEFAULT_SAFETY_SETTINGS,
      },
    });

    return extractGeminiRagContexts(response);
  }

  // Build Interactions API input from a Message (supports text + attachments)
  private static buildInteractionInput(msg: Message): string | Interactions.Content[] {
    return buildGeminiInteractionInput(msg) as string | Interactions.Content[];
  }

  // Build Interactions API input with local history replay.
  // Used when there is no previous_interaction_id (old chats, after non-Interactions responses).
  // Prepends conversation history as a text block, then appends the last user message
  // (with attachments preserved) so the model has full context.
  private static buildHistoryReplayInput(
    messages: Message[],
  ): string | Interactions.Content[] {
    return buildGeminiHistoryReplayInput(messages) as string | Interactions.Content[];
  }

  private shouldUseGenerateContentToolsApi(
    tools: ToolDefinition[],
    ragStoreIds?: string[],
    webSearchEnabled?: boolean,
  ): boolean {
    const modelLower = this.model.toLowerCase();
    if (ragStoreIds && ragStoreIds.length > 0) return false;
    // Gemini 3.8 currently requires GenerateContent's
    // includeServerSideToolInvocations opt-in when combining Google Search
    // with client-side function calling.
    if (modelLower.includes("gemini-3.8-flash") && webSearchEnabled && tools.length > 0) {
      return true;
    }
    if (!(modelLower.includes("gemini-3.1-pro") || modelLower.includes("gemini-3-pro"))) {
      return false;
    }
    return tools.length > 0;
  }

  private buildGenerateContentTools(tools: ToolDefinition[], webSearchEnabled?: boolean): Tool[] | undefined {
    return buildGeminiGenerateContentTools(tools, webSearchEnabled) as Tool[] | undefined;
  }

  private async *chatWithToolsStreamGenerateContent(
    messages: Message[],
    tools: ToolDefinition[],
    systemPrompt?: string,
    executeToolCall?: (name: string, args: Record<string, unknown>) => Promise<unknown>,
    webSearchEnabled?: boolean,
    options?: ChatWithToolsOptions,
  ): AsyncGenerator<StreamChunk> {
    const maxFunctionCalls = options?.functionCallLimits?.maxFunctionCalls ?? DEFAULT_SETTINGS.maxFunctionCalls;
    const warningThreshold = Math.min(
      options?.functionCallLimits?.functionCallWarningThreshold ?? DEFAULT_SETTINGS.functionCallWarningThreshold,
      maxFunctionCalls,
    );
    const traceId = options?.traceId ?? null;
    const lastMsg = messages[messages.length - 1];
    const generationId = tracing.generationStart(traceId, "chatWithToolsStreamGenerateContent", {
      model: this.model,
      input: lastMsg?.content,
      metadata: { useGenerateContentApi: true, toolCount: tools.length, webSearchEnabled: !!webSearchEnabled },
    });
    const contents = this.messagesToContents(messages);
    const generationTools = this.buildGenerateContentTools(tools, webSearchEnabled);
    const thinkingConfig = this.buildThinkingConfig(options?.enableThinking, options?.reasoningEffort);
    const combinesBuiltInAndFunctionTools = !!webSearchEnabled && tools.length > 0;

    yield* runGeminiGenerateContentTools({
      contents, model: this.model, traceId, generationId,
      maxFunctionCalls, warningThreshold, limitPolicy: { kind: "fixed" },
      executeToolCall,
      create: (roundContents, toolMode) => this.ai.models.generateContentStream({
        model: this.model, contents: roundContents as Content[],
        config: {
          systemInstruction: systemPrompt,
          tools: selectGeminiGenerationTools(options?.disableTools ? undefined : generationTools, toolMode),
          toolConfig: toolMode === "all" && combinesBuiltInAndFunctionTools ? { includeServerSideToolInvocations: true } : undefined,
          safetySettings: DEFAULT_SAFETY_SETTINGS, thinkingConfig,
        },
      }),
    });
  }

  // Streaming chat with Function Calling using Interactions API (SSE-based streaming)
  // Supports: function calling + RAG + Google Search simultaneously, server-side conversation state
  async *chatWithToolsStream(
    messages: Message[],
    tools: ToolDefinition[],
    systemPrompt?: string,
    executeToolCall?: (name: string, args: Record<string, unknown>) => Promise<unknown>,
    ragStoreIds?: string[],
    webSearchEnabled?: boolean,
    options?: ChatWithToolsOptions
  ): AsyncGenerator<StreamChunk> {
    if (!options?.disableTools && this.shouldUseGenerateContentToolsApi(tools, ragStoreIds, webSearchEnabled)) {
      yield* this.chatWithToolsStreamGenerateContent(
        messages,
        tools,
        systemPrompt,
        executeToolCall,
        webSearchEnabled,
        options,
      );
      return;
    }

    // Function call limit settings
    const maxFunctionCalls = options?.functionCallLimits?.maxFunctionCalls ?? DEFAULT_SETTINGS.maxFunctionCalls;
    const warningThreshold = Math.min(
      options?.functionCallLimits?.functionCallWarningThreshold ?? DEFAULT_SETTINGS.functionCallWarningThreshold,
      maxFunctionCalls
    );
    const rawTopK = options?.ragTopK ?? 5;
    const clampedTopK = Number.isFinite(rawTopK)
      ? Math.min(20, Math.max(1, rawTopK))
      : 5;

    const ragEnabled = ragStoreIds && ragStoreIds.length > 0;

    // Build tools for Interactions API
    // The Interactions API does not support the file_search tool (returns 501
    // not_implemented). RAG retrieval is done via generateContent API as a
    // pre-processing step, and the retrieved context is injected into the
    // system prompt. This preserves both RAG and function calling.
    // Gemma 4: cannot combine google_search with function calling
    const isGemma4Model = this.model.toLowerCase().includes("gemma-4");
    const effectiveRagEnabled = ragEnabled && !isGemma4Model;
    const effectiveWebSearch = webSearchEnabled ?? false;
    const hasFunctionTools = !options?.disableTools && !(isGemma4Model && effectiveWebSearch) && tools.length > 0;
    const interactionModel = this.getInteractionsModel(hasFunctionTools);
    let interactionTools: Interactions.Tool[] | undefined;
    if (!options?.disableTools) {
      // Gemma 4: when google_search is active, drop function calling tools
      const functionTools = isGemma4Model && effectiveWebSearch ? [] : (tools.length > 0 ? tools : []);
      interactionTools = this.toolsToInteractionsFormat(
        functionTools,
        undefined,
        undefined,
        effectiveWebSearch,
      );
      if (interactionTools.length === 0) interactionTools = undefined;
    }
    const combinesBuiltInAndFunctionTools = effectiveWebSearch && hasFunctionTools;

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      yield { type: "error", error: "No user message to send" };
      return;
    }

    const enableThinking = this.supportsThinking() ? options?.enableThinking : false;
    const reasoningEffort = this.supportsThinking() ? options?.reasoningEffort : undefined;
    const thinkingLevel = resolveGeminiThinkingLevel(this.model, enableThinking, reasoningEffort);
    const generationConfig = (toolMode: GeminiToolMode) => thinkingLevel || (toolMode === "all" && combinesBuiltInAndFunctionTools)
      ? {
          ...(thinkingLevel
            ? { thinking_level: thinkingLevel, thinking_summaries: "auto" as const }
            : {}),
          // Interactions tool-context circulation uses validated choice. The
          // legacy GenerateContent include_server_side_tool_invocations flag
          // is not part of the Interactions request schema.
          ...(toolMode === "all" && combinesBuiltInAndFunctionTools ? { tool_choice: "validated" as const } : {}),
        }
      : undefined;

    // Resolve previous_interaction_id for conversation chaining
    const previousInteractionId = options?.previousInteractionId ?? undefined;

    // Tracing
    const traceId = options?.traceId ?? null;
    const generationId = tracing.generationStart(traceId, "chatWithToolsStream", {
      model: this.model,
      input: lastMessage.content,
      metadata: {
        interactionModel,
        ragEnabled: !!ragEnabled,
        webSearchEnabled: !!webSearchEnabled,
        toolCount: tools.length,
        enableThinking,
        useInteractionsApi: true,
        hasPreviousInteractionId: !!previousInteractionId,
      },
    });
    // RAG pre-retrieval via generateContent API.
    // The Interactions API does not support the file_search tool (501
    // not_implemented), so we retrieve relevant contexts beforehand using
    // the generateContent API and inject them into the system prompt.
    let ragSources: string[] = [];
    let ragContexts: Array<{ source: string; text: string }> = [];
    if (effectiveRagEnabled && ragStoreIds) {
      const retrieverSpanId = tracing.spanStart(traceId, "retriever:file-search", {
        parentId: generationId ?? undefined,
        metadata: { storeCount: ragStoreIds.length, topK: clampedTopK },
      });
      try {
        const ragResult = await this.retrieveRagContext(
          lastMessage.content || "",
          ragStoreIds,
          clampedTopK,
          lastMessage.attachments,
        );
        ragSources = ragResult.sources;
        ragContexts = ragResult.contexts;
        tracing.spanEnd(retrieverSpanId, {
          output: ragSources,
          metadata: { sourceCount: ragSources.length, contextCount: ragContexts.length },
        });
      } catch (ragError) {
        tracing.spanEnd(retrieverSpanId, { error: formatError(ragError) });
        // RAG retrieval failed — continue without RAG context
      }
    }

    // Inject RAG context into system prompt
    let ragSystemPrompt = systemPrompt;
    if (ragContexts.length > 0) {
      const contextBlock = ragContexts
        .map(c => `--- Source: ${c.source} ---\n${c.text}`)
        .join("\n\n");
      ragSystemPrompt = (systemPrompt || "") +
        `\n\n[Semantic search results — use these retrieved passages as reference context]\n${contextBlock}`;
    }

    // Emit RAG sources once (pre-retrieved before the main loop)
    let ragEmitted = false;
    if (ragSources.length > 0) {
      ragEmitted = true;
      yield { type: "rag_used", ragSources };
    }

    // Build the initial input.
    // When chaining via previous_interaction_id the server already knows the conversation,
    // so we only send the latest user message.  Otherwise replay local history as context.
    const input = previousInteractionId
      ? GeminiClient.buildInteractionInput(lastMessage)
      : GeminiClient.buildHistoryReplayInput(messages);

    yield* runGeminiInteractions({
      input, previousInteractionId, model: interactionModel, traceId, generationId,
      searchPolicy: "pre-retrieved", ragAlreadyEmitted: ragEmitted,
      maxFunctionCalls, warningThreshold, limitPolicy: { kind: "fixed" },
      executeToolCall,
      create: request => this.ai.interactions.create({
        model: interactionModel,
        input: request.input as string | Interactions.Content[] | Interactions.Step[],
        stream: true, store: true,
        previous_interaction_id: request.previousInteractionId,
        tools: selectGeminiInteractionTools(interactionTools, request.toolMode),
        system_instruction: ragSystemPrompt, generation_config: generationConfig(request.toolMode),
      }),
    });
  }


}

/**
 * Verify a Gemini API key by listing available models via @google/genai SDK.
 */
export async function verifyGeminiProvider(
  apiKey: string,
  proxyUrl?: string,
  proxyBypass?: string,
): Promise<{ success: boolean; error?: string; models?: string[] }> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    if (proxyUrl) patchGeminiProxy(ai, proxyUrl, proxyBypass);
    const response = await ai.models.list();
    const models: string[] = [];
    for await (const model of response) {
      if (model.name) {
        // Strip "models/" prefix from model names
        models.push(model.name.replace(/^models\//, ""));
      }
    }
    return { success: true, models };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

// Singleton instance
let geminiClientInstance: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient | null {
  return geminiClientInstance;
}

export function initGeminiClient(apiKey: string, model: ModelType, proxyUrl?: string, proxyBypass?: string): GeminiClient {
  geminiClientInstance = new GeminiClient(apiKey, model, proxyUrl, proxyBypass);
  return geminiClientInstance;
}

export function resetGeminiClient(): void {
  geminiClientInstance = null;
}
