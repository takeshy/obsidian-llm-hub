/**
 * Anthropic Native Provider
 * Uses the official Anthropic SDK for full feature support:
 * - Streaming chat with tool use
 * - Multimodal input (images, PDFs)
 * - Extended thinking
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Message, StreamChunk, ToolDefinition, WebSearchCitation } from "../types";
import { calculateCost } from "./modelPricing";
import { createProxyFetch, createNodeFetch } from "./proxyFetch";
import { continuationMatches, WEB_SEARCH_COST_PER_REQUEST } from "./webSearch";

// Match openaiProvider.buildSdkFetch — see that file for rationale. Routes
// through Node http on desktop to bypass CORS for Anthropic-compatible
// gateways that don't set Access-Control-Allow-Origin.
function buildSdkFetch(proxyUrl?: string, proxyBypass?: string): typeof fetch | undefined {
  if (proxyUrl) return createProxyFetch(proxyUrl, proxyBypass);
  try {
    return createNodeFetch();
  } catch {
    return undefined;
  }
}

function isThinkingParameterError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("thinking")
    || lower.includes("budget_tokens")
    || (lower.includes("unsupported") && lower.includes("parameter"))
    || (lower.includes("unknown") && lower.includes("parameter"))
    || (lower.includes("invalid") && lower.includes("parameter"));
}

/**
 * Claude 4.6 and newer models use adaptive thinking. Claude 4.5 and older
 * models only support the legacy fixed `budget_tokens` configuration.
 * Fable and Mythos were introduced after adaptive thinking became the
 * default API shape.
 */
function usesAdaptiveThinking(model: string): boolean {
  const normalized = model.toLowerCase();
  if (/^claude-(?:fable|mythos)-/.test(normalized)) return true;

  const version = normalized.match(/^claude-(?:opus|sonnet)-(\d+)(?:-(\d+))?/);
  if (!version) return false;

  const major = Number(version[1]);
  const minor = version[2] === undefined ? 0 : Number(version[2]);
  return major > 4 || (major === 4 && minor >= 6);
}

/**
 * Verify connection to Anthropic API
 */
export async function verifyAnthropicProvider(
  baseUrl: string,
  apiKey: string,
  proxyUrl?: string,
  proxyBypass?: string,
): Promise<{ success: boolean; error?: string; models?: string[] }> {
  try {
    const sdkFetch = buildSdkFetch(proxyUrl, proxyBypass);
    const client = new Anthropic({
      apiKey,
      baseURL: baseUrl.replace(/\/+$/, ""),
      dangerouslyAllowBrowser: true,
      ...(sdkFetch ? { fetch: sdkFetch } : {}),
    });

    const response = await client.models.list();
    const models = response.data.map(m => m.id);
    return { success: true, models };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Build Anthropic message content with multimodal support
 */
function buildContent(
  msg: Message
): Anthropic.ContentBlockParam[] | string {
  if (!msg.attachments || msg.attachments.length === 0) {
    return msg.content;
  }

  const multimodal = msg.attachments.filter(
    a => a.type === "image" || a.type === "pdf"
  );
  if (multimodal.length === 0) {
    return msg.content;
  }

  const parts: Anthropic.ContentBlockParam[] = [];

  for (const att of multimodal) {
    if (att.type === "image") {
      parts.push({
        type: "image",
        source: {
          type: "base64",
          media_type: att.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: att.data,
        },
      });
    } else if (att.type === "pdf") {
      parts.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: att.data,
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }
  }

  parts.push({ type: "text", text: msg.content });
  return parts;
}

/**
 * Build Anthropic messages from plugin Message array
 */
function buildMessages(
  messages: Message[],
  baseUrl: string,
  model: string,
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];
  for (let index = 0; index < messages.length; index++) {
    const msg = messages[index];
    const hasTriggeringUser = index > 0 && messages[index - 1].role === "user";
    if (msg.role === "assistant" && hasTriggeringUser
      && continuationMatches(msg.providerContinuation, "anthropic", baseUrl, model)) {
      result.push(...msg.providerContinuation.items as Anthropic.MessageParam[]);
    } else {
      result.push({
        role: msg.role,
        content: msg.role === "user" ? buildContent(msg) : msg.content,
      });
    }
  }
  return result;
}

/**
 * Convert plugin ToolDefinition to Anthropic tool format
 */
function toAnthropicTools(tools: ToolDefinition[]): Anthropic.Tool[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Anthropic.Tool.InputSchema,
  }));
}

/**
 * Stream chat with tool use support via Anthropic SDK.
 */
export async function* anthropicChatWithToolsStream(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Message[],
  tools: ToolDefinition[],
  systemPrompt: string,
  executeToolCall: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  signal?: AbortSignal,
  enableThinking?: boolean,
  proxyUrl?: string,
  proxyBypass?: string,
  webSearchEnabled?: boolean,
): AsyncGenerator<StreamChunk> {
  const sdkFetch = buildSdkFetch(proxyUrl, proxyBypass);
  const client = new Anthropic({
    apiKey,
    baseURL: baseUrl.replace(/\/+$/, ""),
    dangerouslyAllowBrowser: true,
    ...(sdkFetch ? { fetch: sdkFetch } : {}),
  });

  const anthropicTools: Anthropic.ToolUnion[] = [
    ...toAnthropicTools(tools),
    ...(webSearchEnabled ? [{ type: "web_search_20250305" as const, name: "web_search" as const }] : []),
  ];
  const conversationMessages = buildMessages(messages, baseUrl, model);
  const continuationMessages: Anthropic.MessageParam[] = [];
  const useThinking = enableThinking === true;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let searchRequests = 0;
  let totalTextLength = 0;
  let webSearchEmitted = false;
  const citations: WebSearchCitation[] = [];
  const searchErrors: string[] = [];

  const THINKING_BUDGET_TOKENS = 10000;
  const adaptiveThinking = useThinking && usesAdaptiveThinking(model);

  const MAX_TOOL_ROUNDS = 20;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let textContent = "";
    let thinkingContent = "";
    const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
    let thinkingEnabledForAttempt = useThinking;
    let finalMessage: Anthropic.Message | undefined;
    const roundTextStart = totalTextLength;
    let roundTextLength = 0;

    for (;;) {
      try {
        const createParams: Anthropic.MessageCreateParamsStreaming = {
          model,
          max_tokens: thinkingEnabledForAttempt ? THINKING_BUDGET_TOKENS + 8192 : 8192,
          system: systemPrompt || undefined,
          messages: [...conversationMessages],
          stream: true,
          ...(thinkingEnabledForAttempt
            ? adaptiveThinking
              ? {
                  thinking: { type: "adaptive" as const },
                  output_config: { effort: "high" as const },
                }
              : { thinking: { type: "enabled" as const, budget_tokens: THINKING_BUDGET_TOKENS } }
            : {}),
        };
        if (anthropicTools.length > 0) {
          createParams.tools = anthropicTools;
        }

        const stream = client.messages.stream(createParams, { signal });

        for await (const event of stream) {
          if (signal?.aborted) return;

          switch (event.type) {
            case "content_block_start": {
              const block = event.content_block;
              if (block.type === "server_tool_use" && block.name === "web_search" && !webSearchEmitted) {
                webSearchEmitted = true;
                yield { type: "web_search_used" };
              } else if (block.type === "web_search_tool_result" && !Array.isArray(block.content)) {
                searchErrors.push(block.content.error_code);
              }
              break;
            }
            case "content_block_delta": {
              const delta = event.delta;
              if (delta.type === "text_delta") {
                textContent += delta.text;
                roundTextLength += delta.text.length;
                yield { type: "text", content: delta.text };
              } else if (delta.type === "thinking_delta") {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const thinkingText = (delta as any).thinking as string || "";
                thinkingContent += thinkingText;
                yield { type: "thinking", content: thinkingText };
              } else if (delta.type === "input_json_delta") {
                // Tool input streaming — accumulated by SDK
              }
              break;
            }
            case "content_block_stop": {
              const blockIndex = event.index;
              const currentMessage = stream.currentMessage;
              if (currentMessage && blockIndex < currentMessage.content.length) {
                const block = currentMessage.content[blockIndex];
                if (block.type === "tool_use") {
                  toolUses.push({
                    id: block.id,
                    name: block.name,
                    input: block.input as Record<string, unknown>,
                  });
                  yield {
                    type: "tool_call",
                    toolCall: { id: block.id, name: block.name, args: block.input as Record<string, unknown> },
                  };
                }
              }
              break;
            }
            case "message_delta": {
              if (event.usage) {
                // Will be emitted with done
              }
              break;
            }
          }
        }

        // `currentMessage` is only the in-progress snapshot. The Anthropic SDK
        // clears it when the stream receives `message_stop`, so it is normally
        // undefined after the async iterator completes. `finalMessage()` reads
        // the retained completed message and also surfaces premature stream
        // termination as an actionable SDK error.
        finalMessage = await stream.finalMessage();
        break;
      } catch (error) {
        if (signal?.aborted) return;
        const msg = error instanceof Error ? error.message : String(error);
        const canRetryWithoutThinking = thinkingEnabledForAttempt
          && textContent.length === 0
          && thinkingContent.length === 0
          && toolUses.length === 0
          && isThinkingParameterError(msg);
        if (canRetryWithoutThinking) {
          thinkingEnabledForAttempt = false;
          continue;
        }
        yield { type: "error", error: msg };
        return;
      }
    }

      if (!finalMessage) {
        yield { type: "error", error: "Anthropic stream completed without a final message" };
        return;
      }

      totalTextLength += roundTextLength;
      totalInputTokens += finalMessage.usage.input_tokens ?? 0;
      totalOutputTokens += finalMessage.usage.output_tokens ?? 0;
      searchRequests += finalMessage.usage.server_tool_use?.web_search_requests ?? 0;

      let blockOffset = 0;
      for (const block of finalMessage.content) {
        if (block.type === "server_tool_use" && block.name === "web_search" && !webSearchEmitted) {
          webSearchEmitted = true;
          yield { type: "web_search_used" };
        }
        if (block.type !== "text") continue;
        for (const citation of block.citations ?? []) {
          if (citation.type === "web_search_result_location") {
            citations.push({
              title: citation.title || citation.url,
              url: citation.url,
              startIndex: roundTextStart + blockOffset,
              endIndex: roundTextStart + blockOffset + block.text.length,
            });
          }
        }
        blockOffset += block.text.length;
      }

      const assistantTurn: Anthropic.MessageParam = {
        role: "assistant",
        content: finalMessage.content as Anthropic.ContentBlockParam[],
      };
      conversationMessages.push(assistantTurn);
      continuationMessages.push(assistantTurn);

      if (toolUses.length === 0) {
        if (finalMessage.stop_reason === "pause_turn") {
          continue;
        }
        if (!textContent && searchErrors.length > 0) {
          yield { type: "error", error: `Anthropic web search failed: ${searchErrors.join(", ")}` };
          return;
        }
        const tokenCost = calculateCost(model, totalInputTokens, totalOutputTokens);
        const cost = tokenCost === undefined && searchRequests === 0
          ? undefined
          : (tokenCost ?? 0) + searchRequests * WEB_SEARCH_COST_PER_REQUEST;
        yield {
          type: "done",
          usage: {
            inputTokens: totalInputTokens || undefined,
            outputTokens: totalOutputTokens || undefined,
            totalTokens: (totalInputTokens + totalOutputTokens) || undefined,
            totalCost: cost,
            webSearchRequests: searchRequests || undefined,
          },
          webSearchCitations: citations.length > 0 ? citations : undefined,
          providerContinuation: webSearchEmitted ? {
            provider: "anthropic",
            baseUrl: baseUrl.replace(/\/+$/, ""),
            model,
            items: continuationMessages,
          } : undefined,
        };
        return;
      }

      // Execute tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        try {
          const result = await executeToolCall(tu.name, tu.input);
          const resultStr = typeof result === "string" ? result : JSON.stringify(result);
          yield { type: "tool_result", toolResult: { toolCallId: tu.id, result } };
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: resultStr,
          });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify({ error: errMsg }),
            is_error: true,
          });
        }
      }

      const resultTurn: Anthropic.MessageParam = {
        role: "user",
        content: toolResults,
      };
      conversationMessages.push(resultTurn);
      continuationMessages.push(resultTurn);
  }

  yield { type: "error", error: "Maximum tool call rounds exceeded" };
}
