/**
 * OpenAI Native Provider
 * Uses the official OpenAI SDK for full feature support:
 * - Streaming chat completions with function calling
 * - Multimodal input (images, PDFs)
 * - DALL-E image generation
 *
 * Also used for OpenAI-compatible providers (OpenRouter, Grok, custom)
 * via baseURL override.
 */

import { requestUrl } from "obsidian";
import OpenAI from "openai";
import type { Message, StreamChunk, ToolDefinition, GeneratedImage } from "../types";
import { calculateCost } from "./modelPricing";
import { parseThinkTags } from "./thinkTagParser";
import { createProxyFetch, createNodeFetch } from "./proxyFetch";

/**
 * Build the fetch implementation to hand to the OpenAI SDK. We can't rely on
 * the renderer's built-in fetch because many OpenAI-compatible gateways
 * (OpenCode Zen / Go, self-hosted reverse proxies, etc.) don't set
 * `Access-Control-Allow-Origin`, and CORS preflight then blocks the request.
 * Routing through Node's http/https module bypasses that entirely.
 *
 * - With a proxy configured → tunnel via `createProxyFetch`.
 * - Otherwise on desktop  → direct Node fetch via `createNodeFetch`.
 * - On mobile (no Node)   → fall back to the renderer's fetch and accept
 *   that CORS-blocked endpoints won't work.
 */
function buildSdkFetch(proxyUrl?: string, proxyBypass?: string): typeof fetch | undefined {
  if (proxyUrl) return createProxyFetch(proxyUrl, proxyBypass);
  try {
    return createNodeFetch();
  } catch {
    return undefined;
  }
}

/** DALL-E model name patterns */
const DALLE_PATTERN = /^dall-e/i;

/** Check if a model name is a DALL-E image generation model */
export function isOpenAiImageModel(model: string): boolean {
  return DALLE_PATTERN.test(model);
}

/**
 * Verify an OpenCode Go provider. Go does not expose `/v1/models`, so this
 * probes `/v1/chat/completions` with a known-valid model name and an empty
 * `messages` array. The server validates the API key first when the model
 * name is recognised, so an `AuthError` indicates the key is wrong.
 *
 *   - 401 or 403                 → fail (treat as authentication failure
 *                                  regardless of the response body — empty
 *                                  bodies, unexpected wrappers, etc. should
 *                                  never silently pass)
 *   - 200 / any other HTTP code  → success (server is reachable; chat-time
 *                                  errors are surfaced through normal flow)
 *   - DNS / connection failure   → fail (URL unreachable)
 *
 * `probeModel` is one of the documented OpenCode Go model ids so that auth
 * checking happens before model validation. If the fallback list ever drifts
 * out of sync, the worst case is the verifier degrades to "any non-401/403
 * HTTP response = success".
 */
const OPENCODE_GO_VERIFY_PROBE_MODEL = "kimi-k2.6";

export async function verifyOpencodeGo(
  baseUrl: string,
  apiKey: string,
  proxyUrl?: string,
  proxyBypass?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!apiKey) {
    return { success: false, error: "API key required" };
  }
  const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
  const body = JSON.stringify({
    model: OPENCODE_GO_VERIFY_PROBE_MODEL,
    messages: [],
  });

  // Pull a short detail snippet out of the response body for the error
  // message. The status code drives the success/fail decision either way.
  const extractDetail = (text: string | undefined): string => {
    if (!text) return "";
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      return parsed.error?.message ?? "";
    } catch {
      return text.trim().slice(0, 200);
    }
  };

  try {
    if (proxyUrl) {
      const proxyFetch = createProxyFetch(proxyUrl, proxyBypass);
      const res = await proxyFetch(url, { method: "POST", headers, body });
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        const detail = extractDetail(text);
        return {
          success: false,
          error: `Authentication failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`,
        };
      }
      return { success: res.status > 0 };
    }
    const res = await requestUrl({ url, method: "POST", headers, body, throw: false });
    if (res.status === 401 || res.status === 403) {
      const detail = extractDetail(res.text);
      return {
        success: false,
        error: `Authentication failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`,
      };
    }
    return { success: res.status > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Cannot reach ${baseUrl}: ${message}` };
  }
}

/**
 * Verify connection to an API provider by calling /v1/models
 */
export async function verifyApiProvider(
  baseUrl: string,
  apiKey: string,
  proxyUrl?: string,
  proxyBypass?: string,
): Promise<{ success: boolean; error?: string; models?: string[] }> {
  try {
    const url = `${baseUrl.replace(/\/+$/, "")}/v1/models`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };
    if (proxyUrl) {
      const proxyFetch = createProxyFetch(proxyUrl, proxyBypass);
      const response = await proxyFetch(url, { method: "GET", headers });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        const detail = errorText.trim();
        throw new Error(
          detail
            ? `HTTP ${response.status} ${response.statusText}: ${detail}`
            : `HTTP ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json() as { data?: { id: string }[] };
      const models = (data.data || []).map((m: { id: string }) => m.id);
      return { success: true, models };
    }
    const response = await requestUrl({ url, method: "GET", headers });
    const data = response.json as { data?: { id: string }[] };
    const models = (data.data || []).map(m => m.id);
    return { success: true, models };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

function createClient(baseUrl: string, apiKey: string, proxyUrl?: string, proxyBypass?: string): OpenAI {
  const sdkFetch = buildSdkFetch(proxyUrl, proxyBypass);
  return new OpenAI({
    apiKey,
    baseURL: `${baseUrl.replace(/\/+$/, "")}/v1`,
    dangerouslyAllowBrowser: true,
    ...(sdkFetch ? { fetch: sdkFetch } : {}),
  });
}

/**
 * Build OpenAI SDK messages from plugin Message array with multimodal support
 */
function buildMessages(
  messages: Message[],
  systemPrompt?: string,
): OpenAI.ChatCompletionMessageParam[] {
  const result: OpenAI.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }

  for (const msg of messages) {
    const role = msg.role === "user" ? "user" as const : "assistant" as const;

    // Prefer `llmContent` (carries inlined non-image attachment text /
    // workspace context built by Local LLM senders) over the bare display
    // `content`. The display content is for the chat UI; the LLM needs the
    // full prompt body. Other paths (API provider) don't set llmContent so
    // this is a no-op for them.
    const textBody = (role === "user" && msg.llmContent) ? msg.llmContent : msg.content;

    if (role === "user" && msg.attachments && msg.attachments.length > 0) {
      const multimodalAttachments = msg.attachments.filter(
        a => a.type === "image" || a.type === "pdf"
      );
      if (multimodalAttachments.length > 0) {
        const parts: OpenAI.ChatCompletionContentPart[] = [
          { type: "text", text: textBody },
        ];
        for (const att of multimodalAttachments) {
          if (att.type === "image") {
            parts.push({
              type: "image_url",
              image_url: { url: `data:${att.mimeType};base64,${att.data}` },
            });
          } else if (att.type === "pdf") {
            // OpenAI supports file input for PDFs
            parts.push({
              type: "file",
              file: {
                filename: att.name,
                file_data: `data:${att.mimeType};base64,${att.data}`,
              },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
          }
        }
        result.push({ role, content: parts });
        continue;
      }
    }

    result.push({ role, content: textBody });
  }

  return result;
}

/**
 * Convert plugin ToolDefinition to OpenAI SDK tool format
 */
function toOpenAiTools(tools: ToolDefinition[]): OpenAI.ChatCompletionTool[] {
  return tools.map(tool => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown>,
    },
  }));
}

/**
 * Generate image using DALL-E via OpenAI SDK
 */
export async function* openaiGenerateImageStream(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  signal?: AbortSignal,
  proxyUrl?: string,
  proxyBypass?: string,
): AsyncGenerator<StreamChunk> {
  const client = createClient(baseUrl, apiKey, proxyUrl, proxyBypass);

  try {
    const response = await client.images.generate({
      model,
      prompt,
      n: 1,
      response_format: "b64_json",
      size: "1024x1024",
    }, { signal });

    for (const item of response.data ?? []) {
      if (item.b64_json) {
        const image: GeneratedImage = {
          mimeType: "image/png",
          data: item.b64_json,
        };
        yield { type: "image_generated", generatedImage: image };
      }
    }

    yield { type: "done" };
  } catch (error) {
    if (signal?.aborted) return;
    const msg = error instanceof Error ? error.message : String(error);
    yield { type: "error", error: msg };
  }
}

/**
 * Convert plugin ToolDefinition to Responses API function tool format
 */
function toResponsesTools(tools: ToolDefinition[]): Array<{ type: "function"; name: string; description?: string; parameters: Record<string, unknown>; strict: boolean }> {
  return tools.map(tool => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters as Record<string, unknown>,
    strict: false,
  }));
}

/**
 * Build Responses API input from plugin Message array
 */
function buildResponsesInput(
  messages: Message[],
): Array<{ role: "user" | "assistant" | "system"; content: string }> {
  return messages.map(msg => ({
    role: msg.role === "user" ? "user" as const : "assistant" as const,
    content: msg.content,
  }));
}

/**
 * Stream via Responses API (supports reasoning for gpt-5+ models).
 * Falls back to Chat Completions API on failure.
 */
async function* openaiResponsesStream(
  client: OpenAI,
  model: string,
  messages: Message[],
  tools: ToolDefinition[],
  systemPrompt: string,
  executeToolCall: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const responsesTools = tools.length > 0 ? toResponsesTools(tools) : undefined;
  // Build input: previous messages as conversation history
  const input: Array<{ role: "user" | "assistant" | "system"; content: string; type?: "message" } | { type: "function_call_output"; call_id: string; output: string }> = buildResponsesInput(messages);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const MAX_TOOL_ROUNDS = 20;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const toolCalls: Array<{ call_id: string; name: string; arguments: string }> = [];

    try {
      const stream = client.responses.stream({
        model,
        input,
        instructions: systemPrompt || undefined,
        tools: responsesTools,
        reasoning: { effort: "high", summary: "detailed" },
      }, { signal });

      for await (const event of stream) {
        if (signal?.aborted) return;

        switch (event.type) {
          case "response.reasoning_text.delta":
          case "response.reasoning_summary_text.delta":
            yield { type: "thinking", content: event.delta };
            break;
          case "response.output_text.delta":
            yield { type: "text", content: event.delta };
            break;
          case "response.output_item.done": {
            const item = event.item;
            if (item.type === "function_call") {
              toolCalls.push({
                call_id: item.call_id,
                name: item.name,
                arguments: item.arguments,
              });
            }
            break;
          }
          case "response.completed": {
            const usage = event.response?.usage;
            if (usage) {
              totalInputTokens += usage.input_tokens ?? 0;
              totalOutputTokens += usage.output_tokens ?? 0;
            }
            break;
          }
        }
      }
    } catch (error) {
      if (signal?.aborted) return;
      const msg = error instanceof Error ? error.message : String(error);
      yield { type: "error", error: msg };
      return;
    }

    // Emit tool calls
    for (const tc of toolCalls) {
      try {
        const args = JSON.parse(tc.arguments) as Record<string, unknown>;
        yield { type: "tool_call", toolCall: { id: tc.call_id, name: tc.name, args } };
      } catch {
        yield { type: "tool_call", toolCall: { id: tc.call_id, name: tc.name, args: {} } };
      }
    }

    if (toolCalls.length === 0) {
      const cost = calculateCost(model, totalInputTokens, totalOutputTokens);
      yield {
        type: "done",
        usage: {
          inputTokens: totalInputTokens || undefined,
          outputTokens: totalOutputTokens || undefined,
          totalTokens: (totalInputTokens + totalOutputTokens) || undefined,
          totalCost: cost,
        },
      };
      return;
    }

    // Execute tool calls and add results to input
    for (const tc of toolCalls) {
      try {
        const args = JSON.parse(tc.arguments) as Record<string, unknown>;
        const result = await executeToolCall(tc.name, args);
        const resultStr = typeof result === "string" ? result : JSON.stringify(result);
        yield { type: "tool_result", toolResult: { toolCallId: tc.call_id, result } };
        input.push({ type: "function_call_output", call_id: tc.call_id, output: resultStr });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        input.push({ type: "function_call_output", call_id: tc.call_id, output: JSON.stringify({ error: errMsg }) });
      }
    }
  }

  yield { type: "error", error: "Maximum tool call rounds exceeded" };
}

/**
 * Stream chat completion with function calling support via OpenAI SDK.
 * When enableThinking is true, tries Responses API first (for gpt-5+ reasoning),
 * then falls back to Chat Completions API with reasoning_effort.
 */
export async function* openaiChatWithToolsStream(
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
  const client = createClient(baseUrl, apiKey, proxyUrl, proxyBypass);
  const useReasoning = enableThinking === true;

  // Responses API is only available on OpenAI's official API, not on compatible providers (OpenRouter, etc.)
  const isOpenAiDirect = baseUrl.replace(/\/+$/, "").includes("api.openai.com");

  // For reasoning-enabled requests on OpenAI direct, try Responses API first
  if (useReasoning && isOpenAiDirect) {
    let responsesWorked = false;
    const responsesStream = openaiResponsesStream(
      client, model, messages, tools, systemPrompt, executeToolCall, signal,
    );
    for await (const chunk of responsesStream) {
      // If Responses API returns an error on the first chunk, fall through to Chat Completions
      if (chunk.type === "error" && !responsesWorked) {
        break;
      }
      responsesWorked = true;
      yield chunk;
    }
    if (responsesWorked) return;
    // Fall through to Chat Completions API with reasoning_effort
  }

  const openaiTools = tools.length > 0 ? toOpenAiTools(tools) : undefined;
  const conversationMessages = buildMessages(messages, systemPrompt);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // State for parsing <think> tags in content stream (used by OpenRouter models)
  let inThinkTag = false;
  let tagBuffer = "";
  let hasNativeReasoning = false;

  const MAX_TOOL_ROUNDS = 20;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let textContent = "";
    let reasoningContent = "";
    let hasToolCalls = false;
    const toolCallAccum = new Map<number, { id: string; name: string; arguments: string }>();

    try {
      const stream = await client.chat.completions.create({
        model,
        messages: conversationMessages,
        tools: openaiTools,
        stream: true,
        stream_options: { include_usage: true },
        ...(useReasoning ? { reasoning_effort: "high" as const } : {}),
      }, { signal });

      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];
        const delta = choice?.delta;

        // Native reasoning fields (reasoning_content for DeepSeek/Moonshot/Kimi,
        // reasoning for OpenRouter). Accumulate locally so we can echo it back
        // on the assistant message — Moonshot/Kimi rejects round 2+ with
        // "thinking is enabled but reasoning_content is missing in assistant
        // tool call message" otherwise.
        const deltaRecord = delta as Record<string, unknown> | undefined;
        if (deltaRecord && ("reasoning_content" in deltaRecord || "reasoning" in deltaRecord)) {
          hasNativeReasoning = true;
          const reasoningText = (deltaRecord.reasoning_content ?? deltaRecord.reasoning) as string | undefined;
          if (reasoningText) {
            reasoningContent += reasoningText;
            yield { type: "thinking", content: reasoningText };
          }
        }

        if (delta?.content) {
          // If no native reasoning field, parse <think> tags from content
          // (used by Qwen, MiniMax, Seed, StepFun, etc. on OpenRouter)
          if (!hasNativeReasoning && !isOpenAiDirect) {
            const parsed = parseThinkTags(delta.content, inThinkTag, tagBuffer);
            inThinkTag = parsed.inThinkTag;
            tagBuffer = parsed.tagBuffer;
            for (const item of parsed.items) {
              if (item.type === "text" && item.content) {
                textContent += item.content;
              }
              yield item;
            }
          } else {
            textContent += delta.content;
            yield { type: "text", content: delta.content };
          }
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            hasToolCalls = true;
            const existing = toolCallAccum.get(tc.index);
            if (existing) {
              if (tc.function?.arguments) {
                existing.arguments += tc.function.arguments;
              }
            } else {
              toolCallAccum.set(tc.index, {
                id: tc.id || `call_${tc.index}`,
                name: tc.function?.name || "",
                arguments: tc.function?.arguments || "",
              });
            }
          }
        }

        if (chunk.usage) {
          totalInputTokens += chunk.usage.prompt_tokens ?? 0;
          totalOutputTokens += chunk.usage.completion_tokens ?? 0;
        }
      }

      // Flush any remaining tag buffer at end of stream and reset state for next round
      if (tagBuffer) {
        yield { type: inThinkTag ? "thinking" : "text", content: tagBuffer };
        if (!inThinkTag) textContent += tagBuffer;
        tagBuffer = "";
      }
      inThinkTag = false;
    } catch (error) {
      if (signal?.aborted) return;
      const msg = error instanceof Error ? error.message : String(error);
      yield { type: "error", error: msg };
      return;
    }

    // Emit tool calls
    for (const [, tc] of toolCallAccum) {
      try {
        const args = JSON.parse(tc.arguments) as Record<string, unknown>;
        yield { type: "tool_call", toolCall: { id: tc.id, name: tc.name, args } };
      } catch {
        yield { type: "tool_call", toolCall: { id: tc.id, name: tc.name, args: {} } };
      }
    }

    if (!hasToolCalls) {
      const cost = calculateCost(model, totalInputTokens, totalOutputTokens);
      yield {
        type: "done",
        usage: {
          inputTokens: totalInputTokens || undefined,
          outputTokens: totalOutputTokens || undefined,
          totalTokens: (totalInputTokens + totalOutputTokens) || undefined,
          totalCost: cost,
        },
      };
      return;
    }

    // Execute tool calls
    const toolCallEntries = [...toolCallAccum.values()];

    // Echo reasoning_content back when the model emitted any. Required by
    // Moonshot/Kimi K2.x via OpenCode Zen Go (which validates that thinking
    // models include reasoning_content on every assistant tool-call turn);
    // ignored by OpenAI/OpenRouter/etc. that don't read the field.
    const assistantMsg: Record<string, unknown> = {
      role: "assistant",
      content: textContent || null,
      tool_calls: toolCallEntries.map(tc => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    };
    if (reasoningContent) {
      assistantMsg.reasoning_content = reasoningContent;
    }
    conversationMessages.push(assistantMsg as unknown as OpenAI.ChatCompletionMessageParam);

    for (const tc of toolCallEntries) {
      try {
        const args = JSON.parse(tc.arguments) as Record<string, unknown>;
        const result = await executeToolCall(tc.name, args);
        const resultStr = typeof result === "string" ? result : JSON.stringify(result);
        yield { type: "tool_result", toolResult: { toolCallId: tc.id, result } };
        conversationMessages.push({ role: "tool", content: resultStr, tool_call_id: tc.id });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        conversationMessages.push({ role: "tool", content: JSON.stringify({ error: errMsg }), tool_call_id: tc.id });
      }
    }
  }

  yield { type: "error", error: "Maximum tool call rounds exceeded" };
}
