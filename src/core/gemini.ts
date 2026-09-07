import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  type Content,
  type Part,
  type Tool,
  type SafetySetting,
  type Chat,
  type Interactions,
  ToolType,
} from "@google/genai";
import {
  DEFAULT_SETTINGS,
  type Message,
  type ToolDefinition,
  type StreamChunk,
  type ToolCall,
  type ModelType,
  type GeneratedImage,
  type WebSearchSource,
  type ReasoningEffort,
} from "src/types";
import { tracing, type TracingUsage } from "src/core/tracingHooks";
import {
  accumulateGeminiUsage as accumulateUsage,
  buildGeminiGenerateContentTools,
  buildGeminiHistoryReplayInput,
  buildGeminiInteractionTools,
  buildGeminiInteractionInput,
  buildGeminiMessageParts,
  buildGeminiRagRequest,
  buildGeminiThinkingConfig,
  collectGeminiWebSources as collectWebSources,
  extractGeminiInteractionsUsage as extractInteractionsUsage,
  extractGeminiRagContexts,
  extractGeminiUsage as extractUsage,
  formatError,
  geminiCorsFetch as corsFetch,
  GEMINI_SEARCH_GROUNDING_COST as SEARCH_GROUNDING_COST,
  getGeminiFinishReasonError as checkFinishReason,
  messagesToGeminiContents,
  serializeGeminiFunctionResult as serializeFunctionResult,
  toGeminiStreamChunkUsage as toStreamChunkUsage,
} from "obsidian-llm-hub-common/core";
import { createProxyFetch } from "./proxyFetch";
import { dedupeAttachments, getToolResultAttachments, withoutToolResultAttachments } from "./toolResultAttachments";

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

export class GeminiClient {
  private ai: GoogleGenAI;
  private model: ModelType;

  constructor(apiKey: string, model: ModelType = "gemini-3.8-flash" as ModelType, proxyUrl?: string, proxyBypass?: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;

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

  getModel(): ModelType {
    return this.model;
  }

  setModel(model: ModelType): void {
    this.model = model;
  }

  private getInteractionsModel(hasFunctionTools: boolean): ModelType {
    const modelName = this.model as string;
    if (modelName === "gemini-3.1-pro-preview" && hasFunctionTools) {
      return "gemini-3.1-pro-preview-customtools" as ModelType;
    }
    return this.model;
  }

  // Build thinking config based on model capabilities (shared across streaming methods)
  private buildThinkingConfig(enableThinking: boolean, reasoningEffort?: ReasoningEffort): Record<string, unknown> | undefined {
    return buildGeminiThinkingConfig(this.model, enableThinking, reasoningEffort);
  }

  // Check if model supports thinking
  private supportsThinking(): boolean {
    return true;
  }

  // Build Gemini Part[] from a Message's attachments and text content
  private static buildMessageParts(msg: Message): Part[] {
    return buildGeminiMessageParts(msg) as Part[];
  }

  // Convert our Message format to Gemini Content format
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
    let functionCallCount = 0;
    let warningEmitted = false;
    const traceId = options?.traceId ?? null;
    const lastMsg = messages[messages.length - 1];
    const generationId = tracing.generationStart(traceId, "chatWithToolsStreamGenerateContent", {
      model: this.model,
      input: lastMsg?.content,
      metadata: { useGenerateContentApi: true, toolCount: tools.length, webSearchEnabled: !!webSearchEnabled },
    });
    const totalUsage: TracingUsage = { input: 0, output: 0, total: 0 };
    let accumulatedOutput = "";
    let roundNumber = 0;
    let toolCallTraceCount = 0;
    let webSearchUsed = false;
    const webSearchSources: WebSearchSource[] = [];

    let contents = this.messagesToContents(messages);
    const generationTools = this.buildGenerateContentTools(tools, webSearchEnabled);
    const thinkingConfig = this.buildThinkingConfig(options?.enableThinking === true, options?.reasoningEffort);
    const combinesBuiltInAndFunctionTools = !!webSearchEnabled && tools.length > 0;

    try {
      while (true) {
        roundNumber++;
        const response = await this.ai.models.generateContentStream({
          model: this.model,
          contents,
          config: {
            systemInstruction: systemPrompt,
            tools: options?.disableTools ? undefined : generationTools,
            toolConfig: combinesBuiltInAndFunctionTools
              ? { includeServerSideToolInvocations: true }
              : undefined,
            safetySettings: DEFAULT_SAFETY_SETTINGS,
            thinkingConfig,
          },
        });

        const modelParts: Part[] = [];
        const functionCalls: Array<{ id?: string; name: string; args: Record<string, unknown> }> = [];
        let roundUsage: TracingUsage | undefined;
        let hasReceivedChunk = false;
        let webSearchUsedInRound = false;

        for await (const chunk of response) {
          hasReceivedChunk = true;
          const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
          const groundedWebSources = (groundingMetadata?.groundingChunks ?? [])
            .map(groundingChunk => groundingChunk.web)
            .filter((web): web is NonNullable<typeof web> => !!web?.uri);
          const searchWasUsed = (groundingMetadata?.webSearchQueries?.length ?? 0) > 0
            || groundedWebSources.length > 0;
          if (searchWasUsed) {
            webSearchUsedInRound = true;
            if (!webSearchUsed) {
              webSearchUsed = true;
              yield { type: "web_search_used" };
            }
            for (const source of groundedWebSources) {
              const url = source.uri!;
              if (!webSearchSources.some(existing => existing.url === url)) {
                webSearchSources.push({ title: source.title || url, url });
              }
            }
          }
          if (chunk.usageMetadata) {
            roundUsage = extractUsage(chunk.usageMetadata, { model: this.model, webSearchUsed: webSearchUsedInRound });
          }

          const blockReason = checkFinishReason(chunk.candidates);
          if (blockReason) {
            tracing.generationEnd(generationId, { error: blockReason, usage: roundUsage });
            yield { type: "error", error: blockReason };
            return;
          }

          const parts = chunk.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            modelParts.push(part);
            if (part.text) {
              if (part.thought) {
                yield { type: "thinking", content: part.text };
              } else {
                accumulatedOutput += part.text;
                yield { type: "text", content: part.text };
              }
            }
            if (part.functionCall?.name) {
              functionCalls.push({
                id: part.functionCall.id,
                name: part.functionCall.name,
                args: part.functionCall.args ?? {},
              });
            }
            if (part.toolResponse?.toolType === ToolType.GOOGLE_SEARCH_WEB) {
              collectWebSources(part.toolResponse.response, webSearchSources);
            }
          }
        }

        if (roundUsage) accumulateUsage(totalUsage, roundUsage);

        if (!hasReceivedChunk) {
          tracing.generationEnd(generationId, { error: "No response received from API" });
          yield { type: "error", error: "No response received from API (possible server error)" };
          return;
        }

        if (modelParts.length > 0) {
          contents = [...contents, { role: "model", parts: modelParts }];
        }

        if (functionCalls.length === 0 || !executeToolCall) {
          tracing.generationEnd(generationId, {
            output: accumulatedOutput,
            usage: totalUsage.total ? totalUsage : undefined,
            metadata: { toolCallCount: toolCallTraceCount, roundCount: roundNumber, useGenerateContentApi: true },
          });
          yield {
            type: "done",
            usage: toStreamChunkUsage(totalUsage.total ? totalUsage : undefined),
            webSearchSources: webSearchSources.length > 0 ? webSearchSources : undefined,
          };
          return;
        }

        const remainingBefore = maxFunctionCalls - functionCallCount;
        if (remainingBefore <= 0) {
          contents = [...contents, {
            role: "user",
            parts: [{ text: "Function call limit reached. Please provide a final answer based on the information gathered so far." }],
          }];
          continue;
        }

        const callsToExecute = functionCalls.slice(0, remainingBefore);
        const remainingAfter = remainingBefore - callsToExecute.length;
        if (!warningEmitted && remainingAfter <= warningThreshold) {
          warningEmitted = true;
          yield { type: "text", content: `\n\n[Note: ${remainingAfter} function calls remaining. Please work efficiently.]` };
        }

        const functionResponseParts: Part[] = [];
        const roundAttachments: import("src/types").Attachment[] = [];
        for (const fc of callsToExecute) {
          const toolCall: ToolCall = { id: fc.id ?? fc.name, name: fc.name, args: fc.args };
          yield { type: "tool_call", toolCall };

          toolCallTraceCount++;
          const toolSpanId = tracing.spanStart(traceId, `tool:${fc.name}`, {
            parentId: generationId ?? undefined,
            input: fc.args,
            metadata: { toolName: fc.name },
          });

          const result = await executeToolCall(fc.name, fc.args);
          tracing.spanEnd(toolSpanId, { output: result });

          const cleanResult = withoutToolResultAttachments(result);
          const serializedResult = serializeFunctionResult(cleanResult);
          accumulatedOutput += `\n[tool_call: ${fc.name}(${JSON.stringify(fc.args)})]\n`;
          accumulatedOutput += `[tool_result: ${serializedResult.length > 500 ? serializedResult.slice(0, 500) + "..." : serializedResult}]\n`;

          yield { type: "tool_result", toolResult: { toolCallId: toolCall.id, result: cleanResult } };

          functionResponseParts.push({
            functionResponse: {
              id: fc.id,
              name: fc.name,
              response: { output: serializedResult },
            },
          });
          roundAttachments.push(...getToolResultAttachments(result));
        }
        // Keep every functionResponse ahead of the media it produced.
        functionResponseParts.push(...dedupeAttachments(roundAttachments).map(attachment => ({
          inlineData: { mimeType: attachment.mimeType, data: attachment.data },
        })));
        functionCallCount += callsToExecute.length;

        if (functionCalls.length > callsToExecute.length || functionCallCount >= maxFunctionCalls) {
          functionResponseParts.push({
            text: "Function call limit reached. Please provide a final answer based on the information gathered so far.",
          });
        }

        contents = [...contents, { role: "user", parts: functionResponseParts }];
      }
    } catch (error) {
      tracing.generationEnd(generationId, {
        error: formatError(error),
        usage: totalUsage.total ? totalUsage : undefined,
        metadata: { toolCallCount: toolCallTraceCount, roundCount: roundNumber, useGenerateContentApi: true },
      });
      yield { type: "error", error: formatError(error) };
    }
  }

  // Simple chat without streaming
  async chat(
    messages: Message[],
    systemPrompt?: string,
    traceId?: string | null
  ): Promise<string> {
    const contents = this.messagesToContents(messages);
    const lastMsg = messages[messages.length - 1];

    const genId = tracing.generationStart(traceId ?? null, "chat", {
      model: this.model,
      input: lastMsg?.content,
    });

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          safetySettings: DEFAULT_SAFETY_SETTINGS,
        },
      });

      // Check for blocked responses (best practice: always check finishReason)
      const blockReason = checkFinishReason(response.candidates);
      if (blockReason) throw new Error(blockReason);

      const text = response.text ?? "";
      tracing.generationEnd(genId, {
        output: text,
        usage: extractUsage(response.usageMetadata, { model: this.model }),
      });
      return text;
    } catch (error) {
      tracing.generationEnd(genId, {
        error: formatError(error),
      });
      throw error;
    }
  }

  // Streaming chat
  async *chatStream(
    messages: Message[],
    systemPrompt?: string,
    traceId?: string | null
  ): AsyncGenerator<StreamChunk> {
    const contents = this.messagesToContents(messages);
    const lastMsg = messages[messages.length - 1];

    const genId = tracing.generationStart(traceId ?? null, "chatStream", {
      model: this.model,
      input: lastMsg?.content,
    });

    try {
      const response = await this.ai.models.generateContentStream({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          safetySettings: DEFAULT_SAFETY_SETTINGS,
        },
      });

      let hasReceivedChunk = false;
      let accumulatedText = "";
      let lastUsage: TracingUsage | undefined;
      for await (const chunk of response) {
        hasReceivedChunk = true;
        if (chunk.usageMetadata) lastUsage = extractUsage(chunk.usageMetadata, { model: this.model });
        const chunkWithCandidates = chunk as {
          candidates?: Array<{
            finishReason?: string;
          }>;
        };
        const blockReason = checkFinishReason(chunkWithCandidates.candidates);
        if (blockReason) {
          tracing.generationEnd(genId, { error: blockReason, usage: lastUsage });
          yield { type: "error", error: blockReason };
          return;
        }
        const text = chunk.text;
        if (text) {
          accumulatedText += text;
          yield { type: "text", content: text };
        }
      }

      if (!hasReceivedChunk) {
        tracing.generationEnd(genId, { error: "No response received from API" });
        yield { type: "error", error: "No response received from API (possible server error)" };
        return;
      }

      tracing.generationEnd(genId, { output: accumulatedText, usage: lastUsage });
      yield { type: "done", usage: toStreamChunkUsage(lastUsage) };
    } catch (error) {
      tracing.generationEnd(genId, {
        error: formatError(error),
      });
      yield {
        type: "error",
        error: formatError(error),
      };
    }
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
    let functionCallCount = 0;
    let warningEmitted = false;

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

    const enableThinking = this.supportsThinking() && options?.enableThinking === true;

    // Build generation config for Interactions API
    const getThinkingLevel = (): "minimal" | "low" | "medium" | "high" | undefined => {
      if (!this.supportsThinking()) return undefined;
      const modelLower = this.model.toLowerCase();
      // Gemma 4: thinking config not supported via Interactions API
      if (modelLower.includes("gemma-4")) return undefined;
      const explicitLevel = options?.reasoningEffort;
      if (explicitLevel && explicitLevel !== "default" && explicitLevel !== "none"
        && explicitLevel !== "xhigh" && explicitLevel !== "max") {
        return explicitLevel;
      }
      // Preserve support for callers outside Chat that explicitly request high thinking.
      if (modelLower.includes("gemini-3.8-flash")) {
        return enableThinking ? "high" : "low";
      }
      if (!enableThinking) return undefined;
      // Gemini 3.5 Flash Lite: "minimal" matches the streaming/SDK path
      // (buildThinkingConfig), which omits thinkingLevel entirely when
      // thinking is disabled and relies on "minimal" being the API default.
      return "high";
    };

    const thinkingLevel = getThinkingLevel();
    const generationConfig = thinkingLevel || combinesBuiltInAndFunctionTools
      ? {
          ...(thinkingLevel
            ? { thinking_level: thinkingLevel, thinking_summaries: "auto" as const }
            : {}),
          // Interactions tool-context circulation uses validated choice. The
          // legacy GenerateContent include_server_side_tool_invocations flag
          // is not part of the Interactions request schema.
          ...(combinesBuiltInAndFunctionTools ? { tool_choice: "validated" as const } : {}),
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
    let toolCallTraceCount = 0;
    let accumulatedOutput = "";
    const totalUsage: TracingUsage = { input: 0, output: 0, total: 0 };
    let roundNumber = 0;
    let currentInteractionId: string | undefined;
    let streamErrored = false;

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

    try {
      let continueLoop = true;
      // v2 input accepts string | Content[] | Step[] (the Interactions API input
      // field is polymorphic). Content[] is used for the initial user turn; Step[]
      // is used when sending function_result + user_input steps back to the model.
      let nextInput: string | Interactions.Content[] | Interactions.Step[] = input;

      while (continueLoop) {
        roundNumber++;
        const roundSpanId = tracing.spanStart(traceId, `round-${roundNumber}`, {
          parentId: generationId ?? undefined,
          metadata: { roundNumber },
        });
        const roundPreviousInteractionId = roundNumber === 1 ? previousInteractionId : currentInteractionId;

        // Create streaming interaction.
        // Tools, system_instruction, and generation_config are passed on every
        // round (including follow-up interactions chained via
        // previous_interaction_id) because the Interactions API does not
        // reliably retain tool declarations across interactions for non-Pro
        // models.  Pro models use the generateContent path instead.
        const stream = await this.ai.interactions.create({
          model: interactionModel,
          input: nextInput,
          stream: true,
          previous_interaction_id: roundPreviousInteractionId,
          store: true,
          tools: interactionTools,
          system_instruction: ragSystemPrompt,
          generation_config: generationConfig,
        });

        const functionCallsToProcess: Array<{ id: string; name: string; args: Record<string, unknown> }> = [];
        const accumulatedSources: string[] = [];
        let groundingEmitted = false;
        let webSearchUsedInRound = false;
        let roundUsage: TracingUsage | undefined;
        let hasReceivedEvent = false;

        const pendingFunctionCalls = new Map<
          number,
          { id: string; name: string; argsBuffer: string; startArgs: Record<string, unknown> }
        >();

        // Process SSE events (v2 steps schema)
        for await (const event of stream) {
          hasReceivedEvent = true;

          switch (event.event_type) {
            case "interaction.created": {
              currentInteractionId = event.interaction?.id;
              break;
            }

            case "step.start": {
              const step = event.step;
              if (step?.type === "function_call") {
                pendingFunctionCalls.set(event.index, {
                  id: step.id,
                  name: step.name,
                  argsBuffer: "",
                  startArgs: step.arguments ?? {},
                });
              }
              break;
            }

            case "step.delta": {
              const delta = event.delta;
              if (!delta) break;

              switch (delta.type) {
                case "text":
                  if ("text" in delta && delta.text) {
                    accumulatedOutput += delta.text;
                    yield { type: "text", content: delta.text };
                  }
                  break;

                case "thought_summary":
                  // Thinking content via summary
                  if ("content" in delta && delta.content) {
                    const thought = delta.content;
                    if ("text" in thought && thought.text) {
                      yield { type: "thinking", content: thought.text };
                    }
                  }
                  break;

                case "arguments_delta": {
                  const pending = pendingFunctionCalls.get(event.index);
                  if (pending && "arguments" in delta && typeof delta.arguments === "string") {
                    pending.argsBuffer += delta.arguments;
                  }
                  break;
                }

                case "file_search_call":
                  break;

                case "file_search_result":
                  // RAG results come through file_search_result deltas
                  if ("result" in delta && Array.isArray(delta.result)) {
                    for (const r of delta.result) {
                      const title = (r as { title?: string }).title;
                      if (title && !accumulatedSources.includes(title)) {
                        accumulatedSources.push(title);
                      }
                    }
                  }
                  break;

                case "google_search_result":
                  if (!webSearchUsedInRound) {
                    webSearchUsedInRound = true;
                    yield { type: "web_search_used" };
                    groundingEmitted = true;
                  }
                  break;

                default:
                  break;
              }
              break;
            }

            case "step.stop": {
              const pending = pendingFunctionCalls.get(event.index);
              if (pending) {
                let args = pending.startArgs;
                if (pending.argsBuffer) {
                  try {
                    args = JSON.parse(pending.argsBuffer) as Record<string, unknown>;
                  } catch {
                    args = pending.startArgs;
                  }
                }
                functionCallsToProcess.push({
                  id: pending.id,
                  name: pending.name,
                  args,
                });
                pendingFunctionCalls.delete(event.index);
              }
              break;
            }

            case "interaction.status_update": {
              // The API can include usage in status-update metadata, but some
              // @google/genai releases type this metadata as StreamMetadata
              // without the runtime `usage` field.
              const usage = (event.metadata as { usage?: Interactions.Usage } | undefined)?.usage;
              if (usage) {
                roundUsage = extractInteractionsUsage(usage, interactionModel);
              }
              break;
            }

            case "interaction.completed": {
              const interaction = event.interaction;
              if (interaction?.usage) {
                roundUsage = extractInteractionsUsage(interaction.usage, interactionModel);
              }
              // Check for blocked/failed/incomplete status
              const status = interaction?.status;
              if (status && status !== "completed" && status !== "requires_action") {
                const statusMsg = `Response ${status}${status === "failed" ? " (possibly blocked by safety filters)" : ""}`;
                tracing.spanEnd(roundSpanId, { error: statusMsg, metadata: { usage: roundUsage } });
                streamErrored = true;
                yield { type: "error", error: statusMsg };
                continueLoop = false;
              }
              break;
            }

            case "error": {
              const errMsg = (event as { error?: { message?: string } }).error?.message ?? "Unknown interaction error";
              tracing.spanEnd(roundSpanId, { error: errMsg, metadata: { usage: roundUsage } });
              streamErrored = true;
              continueLoop = false;
              yield { type: "error", error: errMsg };
              break;
            }

            default:
              break;
          }
        }

        // Sum round usage into total
        if (roundUsage) accumulateUsage(totalUsage, roundUsage);

        // Add search grounding cost
        if (webSearchUsedInRound && this.model && SEARCH_GROUNDING_COST[this.model] !== undefined) {
          totalUsage.totalCost = (totalUsage.totalCost ?? 0) + SEARCH_GROUNDING_COST[this.model];
        }

        // RAG sources were already emitted before the loop (pre-retrieved via
        // generateContent API since Interactions API doesn't support file_search).
        // Web search grounding is still detected within the loop below.
        if (accumulatedSources.length > 0 && !groundingEmitted && !ragEmitted) {
          yield { type: "rag_used", ragSources: accumulatedSources };
          groundingEmitted = true;
        }

        if (!hasReceivedEvent && functionCallsToProcess.length === 0) {
          tracing.spanEnd(roundSpanId, { error: "No response received from API" });
          yield { type: "error", error: "No response received from API (possible server error)" };
          return;
        }

        if (streamErrored) {
          break;
        }

        // Process function calls
        if (functionCallsToProcess.length > 0 && executeToolCall) {
          const remainingBefore = maxFunctionCalls - functionCallCount;

          if (remainingBefore <= 0) {
            yield {
              type: "text",
              content: "\n\n[Function call limit reached. Summarizing with available information...]",
            };
            // Request final answer
            nextInput = "You have reached the function call limit. Please provide a final answer based on the information gathered so far.";
            tracing.spanEnd(roundSpanId, { metadata: { reason: "function_call_limit", usage: roundUsage } });
            // One more round to get the final answer, then stop
            roundNumber++;
            const finalStream = await this.ai.interactions.create({
              model: interactionModel,
              input: nextInput,
              stream: true,
              system_instruction: ragSystemPrompt,
              previous_interaction_id: currentInteractionId,
              store: true,
              generation_config: generationConfig,
            });
            let finalUsage: TracingUsage | undefined;
            for await (const event of finalStream) {
              if (event.event_type === "step.delta" && event.delta?.type === "text" && "text" in event.delta) {
                const text = event.delta.text;
                accumulatedOutput += text;
                yield { type: "text", content: text };
              }
              if (event.event_type === "interaction.created" && event.interaction?.id) {
                currentInteractionId = event.interaction.id;
              }
              if (event.event_type === "interaction.completed" && event.interaction?.usage) {
                finalUsage = extractInteractionsUsage(event.interaction.usage, interactionModel);
              }
            }
            if (finalUsage) accumulateUsage(totalUsage, finalUsage);
            continueLoop = false;
            continue;
          }

          const callsToExecute = functionCallsToProcess.slice(0, remainingBefore);
          const skippedCount = functionCallsToProcess.length - callsToExecute.length;

          const remainingAfter = remainingBefore - callsToExecute.length;
          if (!warningEmitted && remainingAfter <= warningThreshold) {
            warningEmitted = true;
            yield {
              type: "text",
              content: `\n\n[Note: ${remainingAfter} function calls remaining. Please work efficiently.]`,
            };
          }

          // Execute function calls and build FunctionResultStep inputs for v2.
          const functionResults: Interactions.Step[] = [];
          const roundAttachments: import("src/types").Attachment[] = [];

          for (const fc of callsToExecute) {
            const toolCall: ToolCall = {
              id: fc.id,
              name: fc.name,
              args: fc.args,
            };

            yield { type: "tool_call", toolCall };

            toolCallTraceCount++;
            const toolSpanId = tracing.spanStart(traceId, `tool:${fc.name}`, {
              parentId: generationId ?? undefined,
              input: fc.args,
              metadata: { toolName: fc.name },
            });

            const result = await executeToolCall(fc.name, fc.args);

            tracing.spanEnd(toolSpanId, { output: result });

            const cleanResult = withoutToolResultAttachments(result);
            const serializedResult = serializeFunctionResult(cleanResult);
            const truncatedResult = serializedResult.length > 500 ? serializedResult.substring(0, 500) + "..." : serializedResult;
            accumulatedOutput += `\n[tool_call: ${fc.name}(${JSON.stringify(fc.args)})]\n`;
            accumulatedOutput += `[tool_result: ${truncatedResult}]\n`;

            yield {
              type: "tool_result",
              toolResult: { toolCallId: toolCall.id, result: cleanResult },
            };

            // Build FunctionResultStep for the v2 Interactions API.
            // Use a JSON string result, matching the SDK README examples and
            // avoiding stricter model-side validation of arbitrary objects.
            functionResults.push({
              type: "function_result",
              call_id: fc.id,
              name: fc.name,
              result: serializedResult,
            });
            roundAttachments.push(...getToolResultAttachments(result));
          }

          // Keep every function_result ahead of the media it produced.
          const roundFiles = dedupeAttachments(roundAttachments);
          if (roundFiles.length > 0) {
            functionResults.push({
              type: "user_input",
              content: roundFiles.map(attachment => ({
                type: "document" as const,
                data: attachment.data,
                mime_type: attachment.mimeType,
              })),
            });
          }

          functionCallCount += callsToExecute.length;

          if (skippedCount > 0 || functionCallCount >= maxFunctionCalls) {
            const skippedMsg = skippedCount > 0
              ? ` (${skippedCount} additional calls were skipped)`
              : "";
            yield {
              type: "text",
              content: `\n\n[Function call limit reached${skippedMsg}. Summarizing with available information...]`,
            };

            // Send results + limit message
            functionResults.push({
              type: "user_input",
              content: [{ type: "text", text: "[System: Function call limit reached. Please provide a final answer based on the information gathered so far.]" }],
            });
            nextInput = functionResults;
            tracing.spanEnd(roundSpanId, { metadata: { reason: "function_call_limit_with_skipped", usage: roundUsage } });

            // Final round
            roundNumber++;
            const finalStream = await this.ai.interactions.create({
              model: interactionModel,
              input: nextInput,
              stream: true,
              tools: interactionTools,
              system_instruction: ragSystemPrompt,
              previous_interaction_id: currentInteractionId,
              store: true,
              generation_config: generationConfig,
            });
            let finalUsage: TracingUsage | undefined;
            for await (const event of finalStream) {
              if (event.event_type === "step.delta" && event.delta?.type === "text" && "text" in event.delta) {
                const text = event.delta.text;
                accumulatedOutput += text;
                yield { type: "text", content: text };
              }
              if (event.event_type === "interaction.created" && event.interaction?.id) {
                currentInteractionId = event.interaction.id;
              }
              if (event.event_type === "interaction.completed" && event.interaction?.usage) {
                finalUsage = extractInteractionsUsage(event.interaction.usage, interactionModel);
              }
            }
            if (finalUsage) accumulateUsage(totalUsage, finalUsage);
            continueLoop = false;
            continue;
          }

          // Add warning if approaching limit
          if (warningEmitted && remainingAfter <= warningThreshold) {
            functionResults.push({
              type: "user_input",
              content: [{ type: "text", text: `[System: You have ${remainingAfter} function calls remaining. Please complete your task efficiently or provide a summary.]` }],
            });
          }

          // Send function results back — next iteration creates a new interaction chained via previous_interaction_id
          nextInput = functionResults;
          tracing.spanEnd(roundSpanId, { metadata: { toolCalls: callsToExecute.map(c => c.name), usage: roundUsage } });
        } else {
          tracing.spanEnd(roundSpanId, { metadata: { final: true, usage: roundUsage } });
          continueLoop = false;
        }
      }

      if (streamErrored) {
        tracing.generationEnd(generationId, {
          error: "Interaction stream failed",
          usage: totalUsage.total ? totalUsage : undefined,
          metadata: { toolCallCount: toolCallTraceCount, roundCount: roundNumber },
        });
        return;
      }


      const generationMetadata: Record<string, unknown> = { toolCallCount: toolCallTraceCount, roundCount: roundNumber };
      if (totalUsage.toolUsePromptTokens) {
        generationMetadata.toolUsePromptTokens = totalUsage.toolUsePromptTokens;
        if (totalUsage.total) {
          generationMetadata.ragTokenRatio = totalUsage.toolUsePromptTokens / totalUsage.total;
        }
      }
      tracing.generationEnd(generationId, {
        output: accumulatedOutput,
        usage: totalUsage.total ? totalUsage : undefined,
        metadata: generationMetadata,
      });

      yield {
        type: "done",
        usage: toStreamChunkUsage(totalUsage.total ? totalUsage : undefined),
        interactionId: currentInteractionId,
      };
    } catch (error) {
      tracing.generationEnd(generationId, {
        error: formatError(error),
        usage: totalUsage.total ? totalUsage : undefined,
        metadata: { toolCallCount: toolCallTraceCount, roundCount: roundNumber },
      });

      yield {
        type: "error",
        error: formatError(error),
      };
    }
  }

  // Streaming workflow generation with thinking
  async *generateWorkflowStream(
    messages: Message[],
    systemPrompt?: string,
    traceId?: string | null
  ): AsyncGenerator<StreamChunk> {
    // Build history from all messages except the last one
    const historyMessages = messages.slice(0, -1);
    const history = this.messagesToContents(historyMessages);

    // Get the last user message.
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      yield { type: "error", error: "No user message to send" };
      return;
    }

    // Workflow generation always enables thinking (unless model doesn't support it)
    const thinkingConfig = this.buildThinkingConfig(true);

    // Create a chat session with history (no tools for workflow generation)
    const chat: Chat = this.ai.chats.create({
      model: this.model,
      history,
      config: {
        systemInstruction: systemPrompt,
        safetySettings: DEFAULT_SAFETY_SETTINGS,
        thinkingConfig,
      },
    });

    const messageParts = GeminiClient.buildMessageParts(lastMessage);

    const genId = tracing.generationStart(traceId ?? null, "generateWorkflowStream", {
      model: this.model,
      input: lastMessage.content,
      metadata: { enableThinking: this.supportsThinking() },
    });

    try {
      const response = await chat.sendMessageStream({ message: messageParts });
      let accumulatedText = "";
      let lastUsage: TracingUsage | undefined;

      for await (const chunk of response) {
        if (chunk.usageMetadata) lastUsage = extractUsage(chunk.usageMetadata, { model: this.model });
        // Access candidates via type assertion for thought parts and finishReason
        const chunkWithCandidates = chunk as {
          candidates?: Array<{
            finishReason?: string;
            content?: {
              parts?: Array<{
                text?: string;
                thought?: boolean;
              }>;
            };
          }>;
        };
        const candidates = chunkWithCandidates.candidates;

        // Check finishReason for blocked responses (best practice)
        const blockReason = checkFinishReason(candidates);
        if (blockReason) {
          tracing.generationEnd(genId, { error: blockReason, usage: lastUsage });
          yield { type: "error", error: blockReason };
          return;
        }

        // Extract and yield thinking parts
        if (candidates && candidates.length > 0) {
          const parts = candidates[0]?.content?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.thought && part.text) {
                yield { type: "thinking", content: part.text };
              }
            }
          }
        }

        // Yield text chunks
        const text = chunk.text;
        if (text) {
          accumulatedText += text;
          yield { type: "text", content: text };
        }
      }

      tracing.generationEnd(genId, { output: accumulatedText, usage: lastUsage });
      yield { type: "done", usage: toStreamChunkUsage(lastUsage) };
    } catch (error) {
      tracing.generationEnd(genId, {
        error: formatError(error),
      });
      yield {
        type: "error",
        error: formatError(error),
      };
    }
  }

  // Deep Research using Interactions API agent
  async *deepResearchStream(
    query: string,
    previousInteractionId?: string | null,
    traceId?: string | null
  ): AsyncGenerator<StreamChunk> {
    const genId = tracing.generationStart(traceId ?? null, "deepResearch", {
      model: "deep-research-pro-preview-12-2025",
      input: query,
    });

    try {
      // Create a background interaction with the Deep Research agent
      const interaction = await this.ai.interactions.create({
        agent: "deep-research-pro-preview-12-2025",
        input: query,
        background: true,
        previous_interaction_id: previousInteractionId ?? undefined,
        store: true,
      });

      const interactionId = interaction.id;
      yield { type: "text", content: "Deep Research started. Polling for results...\n\n" };

      // Poll for completion
      const maxPolls = 180;  // 30 min max (10s intervals)
      for (let i = 0; i < maxPolls; i++) {
        await new Promise(resolve => window.setTimeout(resolve, 10000));

        const result = await this.ai.interactions.get(interactionId);

        if (result.status === "completed") {
          let fullText = result.output_text ?? "";
          if (!fullText && Array.isArray(result.steps)) {
            for (const step of result.steps) {
              if (step?.type === "model_output" && Array.isArray(step.content)) {
                for (const content of step.content as Array<{ type?: string; text?: string }>) {
                  if (content?.type === "text" && content.text) {
                    fullText += content.text;
                  }
                }
              }
            }
          }

          if (fullText) {
            yield { type: "text", content: fullText };
          }

          const usage = extractInteractionsUsage(result.usage, "deep-research-pro-preview-12-2025");
          tracing.generationEnd(genId, { output: fullText, usage });
          yield {
            type: "done",
            usage: toStreamChunkUsage(usage),
            interactionId,
          };
          return;
        }

        if (result.status === "failed" || result.status === "cancelled") {
          const errMsg = `Deep Research ${result.status}`;
          tracing.generationEnd(genId, { error: errMsg });
          yield { type: "error", error: errMsg };
          return;
        }

        // Still in progress
        if (i % 3 === 0 && i > 0) {
          yield { type: "text", content: "." };
        }
      }

      tracing.generationEnd(genId, { error: "Deep Research timed out" });
      yield { type: "error", error: "Deep Research timed out after 30 minutes" };
    } catch (error) {
      tracing.generationEnd(genId, { error: formatError(error) });
      yield { type: "error", error: formatError(error) };
    }
  }

  // Image generation using Gemini
  async *generateImageStream(
    messages: Message[],
    imageModel: ModelType,
    systemPrompt?: string,
    webSearchEnabled?: boolean,
    _ragStoreIds?: string[],  // Reserved for future RAG support in image generation
    traceId?: string | null
  ): AsyncGenerator<StreamChunk> {
    // Build history from all messages except the last one
    const historyMessages = messages.slice(0, -1);
    const history = this.messagesToContents(historyMessages);

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      yield { type: "error", error: "No user message to send" };
      return;
    }

    const messageParts = GeminiClient.buildMessageParts(lastMessage);

    // Build tools array
    // Image models: Web Search only (no RAG)
    const tools: Tool[] = [];

    if (webSearchEnabled) {
      tools.push({ googleSearch: {} });
    }

    const genId = tracing.generationStart(traceId ?? null, "generateImageStream", {
      model: imageModel,
      input: lastMessage.content,
      metadata: { webSearchEnabled: !!webSearchEnabled },
    });

    try {
      const response = await this.ai.models.generateContent({
        model: imageModel,
        contents: [...history, { role: "user", parts: messageParts }],
        config: {
          systemInstruction: systemPrompt,
          safetySettings: DEFAULT_SAFETY_SETTINGS,
          responseModalities: ["TEXT", "IMAGE"],
          tools: tools.length > 0 ? tools : undefined,
        },
      });

      // Check for blocked responses (best practice: always check finishReason)
      const blockReason = checkFinishReason(response.candidates);
      if (blockReason) {
        tracing.generationEnd(genId, { error: blockReason });
        yield { type: "error", error: blockReason };
        return;
      }

      // Emit web search used if enabled
      if (webSearchEnabled) {
        yield { type: "web_search_used" };
      }

      // Process response parts
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            // Handle text parts
            if ("text" in part && part.text) {
              yield { type: "text", content: part.text };
            }
            // Handle image parts
            if ("inlineData" in part && part.inlineData) {
              const imageData = part.inlineData as { mimeType?: string; data?: string };
              if (imageData.mimeType && imageData.data) {
                const generatedImage: GeneratedImage = {
                  mimeType: imageData.mimeType,
                  data: imageData.data,
                };
                yield { type: "image_generated", generatedImage };
              }
            }
          }
        }
      }

      const imageWebSearchUsed = !!webSearchEnabled;
      const imageUsage = extractUsage(response.usageMetadata, { model: imageModel, webSearchUsed: imageWebSearchUsed });
      tracing.generationEnd(genId, {
        output: "[image generation completed]",
        usage: imageUsage,
      });
      yield { type: "done", usage: toStreamChunkUsage(imageUsage) };
    } catch (error) {
      tracing.generationEnd(genId, {
        error: formatError(error),
      });
      yield {
        type: "error",
        error: formatError(error),
      };
    }
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
