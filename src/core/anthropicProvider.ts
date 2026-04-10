/**
 * Anthropic Native Provider
 * Uses the official Anthropic SDK for full feature support:
 * - Streaming chat with tool use
 * - Multimodal input (images, PDFs)
 * - Extended thinking
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Message, StreamChunk, ToolDefinition } from "../types";
import { calculateCost } from "./modelPricing";
import { createProxyFetch } from "./proxyFetch";

function isThinkingParameterError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("thinking")
    || lower.includes("budget_tokens")
    || (lower.includes("unsupported") && lower.includes("parameter"))
    || (lower.includes("unknown") && lower.includes("parameter"))
    || (lower.includes("invalid") && lower.includes("parameter"));
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
    const client = new Anthropic({
      apiKey,
      baseURL: baseUrl.replace(/\/+$/, ""),
      dangerouslyAllowBrowser: true,
      ...(proxyUrl ? { fetch: createProxyFetch(proxyUrl, proxyBypass) } : {}),
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
  messages: Message[]
): Anthropic.MessageParam[] {
  return messages.map(msg => ({
    role: msg.role === "user" ? "user" as const : "assistant" as const,
    content: msg.role === "user" ? buildContent(msg) : msg.content,
  }));
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
): AsyncGenerator<StreamChunk> {
  const client = new Anthropic({
    apiKey,
    baseURL: baseUrl.replace(/\/+$/, ""),
    dangerouslyAllowBrowser: true,
    ...(proxyUrl ? { fetch: createProxyFetch(proxyUrl, proxyBypass) } : {}),
  });

  const anthropicTools = tools.length > 0 ? toAnthropicTools(tools) : undefined;
  const conversationMessages = buildMessages(messages);
  const useThinking = enableThinking === true;

  const THINKING_BUDGET_TOKENS = 10000;

  const MAX_TOOL_ROUNDS = 20;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let textContent = "";
    let thinkingContent = "";
    let thinkingSignature = "";
    const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
    let thinkingEnabledForAttempt = useThinking;
    let finalMessage: Anthropic.Message | undefined;

    for (;;) {
      try {
        const createParams: Anthropic.MessageCreateParamsStreaming = {
          model,
          max_tokens: thinkingEnabledForAttempt ? THINKING_BUDGET_TOKENS + 8192 : 8192,
          system: systemPrompt || undefined,
          messages: conversationMessages,
          stream: true,
          ...(thinkingEnabledForAttempt ? { thinking: { type: "enabled" as const, budget_tokens: THINKING_BUDGET_TOKENS } } : {}),
        };
        if (anthropicTools && anthropicTools.length > 0) {
          createParams.tools = anthropicTools;
        }

        const stream = client.messages.stream(createParams, { signal });

        for await (const event of stream) {
          if (signal?.aborted) return;

          switch (event.type) {
            case "content_block_start": {
              break;
            }
            case "content_block_delta": {
              const delta = event.delta;
              if (delta.type === "text_delta") {
                textContent += delta.text;
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
                if (block.type === "thinking") {
                  thinkingSignature = (block as { signature?: string }).signature || "";
                } else if (block.type === "tool_use") {
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

        finalMessage = stream.currentMessage;
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

      const inTok = finalMessage?.usage?.input_tokens ?? 0;
      const outTok = finalMessage?.usage?.output_tokens ?? 0;
      const cost = calculateCost(model, inTok, outTok);
      const usage = finalMessage ? {
        inputTokens: inTok || undefined,
        outputTokens: outTok || undefined,
        totalTokens: (inTok + outTok) || undefined,
        totalCost: cost,
      } : undefined;

      if (toolUses.length === 0) {
        yield { type: "done", usage };
        return;
      }

      // Execute tool calls
      conversationMessages.push({
        role: "assistant",
        content: [
          ...(textContent ? [{ type: "text" as const, text: textContent }] : []),
          ...(thinkingContent ? [{ type: "thinking" as const, thinking: thinkingContent, signature: thinkingSignature } as Anthropic.ContentBlockParam] : []),
          ...toolUses.map(tu => ({
            type: "tool_use" as const,
            id: tu.id,
            name: tu.name,
            input: tu.input,
          })),
        ],
      });

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

      conversationMessages.push({
        role: "user",
        content: toolResults,
      });
  }

  yield { type: "error", error: "Maximum tool call rounds exceeded" };
}
