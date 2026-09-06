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
import type { Message, StreamChunk, ToolDefinition, GeneratedImage, WebSearchCitation, WebSearchSource, ReasoningEffort } from "../types";
import { calculateCost } from "./modelPricing";
import { parseThinkTags } from "./thinkTagParser";
import { createProxyFetch, createNodeFetch } from "./proxyFetch";
import { dedupeAttachments, getToolResultAttachments, withoutToolResultAttachments } from "./toolResultAttachments";
import {
  continuationMatches,
  deduplicateWebSearchSources,
  getOfficialResponsesProvider,
  WEB_SEARCH_COST_PER_REQUEST,
  XAI_WEB_SEARCH_COST_PER_REQUEST,
} from "./webSearch";

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
 * Verify an OpenCode Go provider. Fetch the live model catalog first, then
 * probe `/v1/chat/completions` with one of the returned model IDs. The models
 * endpoint changes as OpenCode adds or retires Go models, while the chat probe
 * ensures a public catalog response cannot make an invalid API key look valid.
 *
 *   - 401 or 403                 → fail (treat as authentication failure
 *                                  regardless of the response body — empty
 *                                  bodies, unexpected wrappers, etc. should
 *                                  never silently pass)
 *   - 200 / any other HTTP code  → success (server is reachable; chat-time
 *                                  errors are surfaced through normal flow)
 *   - DNS / connection failure   → fail (URL unreachable)
 *
 * The OpenCode config uses `opencode-go/<model-id>`, but its OpenAI-compatible
 * API returns and accepts bare model IDs.
 */
export async function verifyOpencodeGo(
  baseUrl: string,
  apiKey: string,
  proxyUrl?: string,
  proxyBypass?: string,
): Promise<{ success: boolean; error?: string; models?: string[] }> {
  if (!apiKey) {
    return { success: false, error: "API key required" };
  }
  const discovery = await verifyApiProvider(baseUrl, apiKey, proxyUrl, proxyBypass);
  if (!discovery.success) return discovery;
  const models = discovery.models ?? [];
  if (models.length === 0) {
    return { success: false, error: "OpenCode Go returned no models" };
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
  const body = JSON.stringify({
    model: models[0],
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
      return { success: res.status > 0, models };
    }
    const res = await requestUrl({ url, method: "POST", headers, body, throw: false });
    if (res.status === 401 || res.status === 403) {
      const detail = extractDetail(res.text);
      return {
        success: false,
        error: `Authentication failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`,
      };
    }
    return { success: res.status > 0, models };
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
            });
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
 * Parse a tool call's raw `arguments` string into an object.
 *
 * Models that call a tool with no arguments emit an empty string (or omit the
 * field entirely), and some emit `null` or a non-object literal.
 */
function parseToolArguments(raw: string): Record<string, unknown> | null {
  if (!raw.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

/**
 * Normalize the `arguments` string echoed back in the assistant tool-call turn.
 *
 * Gateways that translate OpenAI tool calls into another provider's format map
 * this string onto a field that must be an object — Anthropic rejects anything
 * else with `tool_use.input: Input should be an object`. An empty string is
 * what a no-argument call produces, so it has to become `{}` before the history
 * is replayed on the next round.
 */
function normalizeToolArguments(raw: string): string {
  return parseToolArguments(raw) === null ? "{}" : raw;
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
      parameters: tool.parameters,
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
    parameters: tool.parameters,
    strict: false,
  }));
}

/**
 * Build Responses API input from plugin Message array
 */
function buildResponsesInput(
  messages: Message[],
  baseUrl: string,
  model: string,
  continuationProvider: "openai" | "xai",
): OpenAI.Responses.ResponseInputItem[] {
  const result: OpenAI.Responses.ResponseInputItem[] = [];
  for (let index = 0; index < messages.length; index++) {
    const msg = messages[index];
    const hasTriggeringUser = index > 0 && messages[index - 1].role === "user";
    if (msg.role === "assistant" && hasTriggeringUser
      && continuationMatches(msg.providerContinuation, continuationProvider, baseUrl, model)) {
      result.push(...msg.providerContinuation.items as OpenAI.Responses.ResponseInputItem[]);
      continue;
    }

    const text = msg.role === "user" && msg.llmContent ? msg.llmContent : msg.content;
    if (msg.role === "user" && msg.attachments?.some(a => a.type === "image" || a.type === "pdf")) {
      const content: OpenAI.Responses.ResponseInputContent[] = [{ type: "input_text", text }];
      for (const attachment of msg.attachments) {
        if (attachment.type === "image") {
          content.push({
            type: "input_image",
            detail: "auto",
            image_url: `data:${attachment.mimeType};base64,${attachment.data}`,
          });
        } else if (attachment.type === "pdf") {
          content.push({
            type: "input_file",
            filename: attachment.name,
            file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
          });
        }
      }
      result.push({ role: "user", content });
    } else {
      // Tool-role messages are a local-provider shape; this path never sees them.
      result.push({ role: msg.role === "tool" ? "assistant" : msg.role, content: text });
    }
  }
  return result;
}

interface XaiResponseMetadata {
  usage?: OpenAI.Responses.ResponseUsage & {
    cost_in_usd_ticks?: number | string;
    server_side_tool_usage?: Record<string, number>;
  };
  server_side_tool_usage?: Record<string, number>;
  citations?: string[];
}

function getXaiResponseMetrics(response: OpenAI.Responses.Response): {
  searchRequests: number;
  cost?: number;
} {
  const metadata = response as unknown as XaiResponseMetadata;
  const toolUsage = metadata.server_side_tool_usage ?? metadata.usage?.server_side_tool_usage;
  const searchRequests = toolUsage?.SERVER_SIDE_TOOL_WEB_SEARCH ?? 0;
  const rawTicks = metadata.usage?.cost_in_usd_ticks;
  const ticks = typeof rawTicks === "string" ? Number(rawTicks) : rawTicks;
  return {
    searchRequests,
    cost: typeof ticks === "number" && Number.isFinite(ticks) ? ticks / 10_000_000_000 : undefined,
  };
}

/** xAI Responses already embeds [[N]](url) links; collect pills without reinserting links. */
function extractXaiWebSearchSources(response: OpenAI.Responses.Response): WebSearchSource[] {
  const annotationSources: WebSearchSource[] = [];
  const titleByUrl = new Map<string, string>();
  const inlineSources: WebSearchSource[] = [];

  for (const item of response.output) {
    if (item.type !== "message") continue;
    for (const part of item.content) {
      if (part.type !== "output_text") continue;
      const annotations = (part as unknown as {
        annotations?: Array<{ type?: string; url?: string; title?: string }>;
      }).annotations ?? [];
      for (const annotation of annotations) {
        if (annotation.type !== "url_citation" || !annotation.url) continue;
        const source = { title: annotation.title || annotation.url, url: annotation.url };
        annotationSources.push(source);
        if (!titleByUrl.has(source.url)) titleByUrl.set(source.url, source.title);
      }

      const citationPattern = /\[\[\d+\]\]\((https?:\/\/[^)\s]+)\)/g;
      for (const match of part.text.matchAll(citationPattern)) {
        const url = match[1];
        inlineSources.push({ title: titleByUrl.get(url) || url, url });
      }
    }
  }

  const metadata = response as unknown as XaiResponseMetadata;
  const responseSources = (metadata.citations ?? []).map(url => ({ title: titleByUrl.get(url) || url, url }));
  return deduplicateWebSearchSources([...inlineSources, ...annotationSources, ...responseSources]);
}

/**
 * Stream via the OpenAI-compatible Responses API used by OpenAI and xAI.
 * Callers decide whether a failed non-search request may fall back to Chat Completions.
 */
async function* openaiResponsesStream(
  client: OpenAI,
  baseUrl: string,
  model: string,
  messages: Message[],
  tools: ToolDefinition[],
  systemPrompt: string,
  executeToolCall: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  signal?: AbortSignal,
  reasoningEffort?: ReasoningEffort,
  webSearchEnabled?: boolean,
  continuationProvider: "openai" | "xai" = "openai",
): AsyncGenerator<StreamChunk> {
  const providerLabel = continuationProvider === "xai" ? "xAI" : "OpenAI";
  const responsesTools: OpenAI.Responses.Tool[] = [
    ...toResponsesTools(tools),
    ...(webSearchEnabled ? [{ type: "web_search" as const }] : []),
  ];
  const priorAssistant = [...messages].reverse().find(message => message.role === "assistant");
  const priorContinuation = continuationProvider === "openai"
    && continuationMatches(priorAssistant?.providerContinuation, continuationProvider, baseUrl, model)
    && priorAssistant.providerContinuation.responseId
    ? priorAssistant.providerContinuation
    : undefined;
  let previousResponseId = priorContinuation?.responseId;
  // A native response chain already contains earlier turns. Without one, use
  // the existing stateless replay path (also used by xAI and old histories).
  let input = buildResponsesInput(
    previousResponseId ? messages.slice(-1) : messages,
    baseUrl, model, continuationProvider,
  );
  const continuationItems: OpenAI.Responses.ResponseInputItem[] = [];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalTextLength = 0;
  let searchRequests = 0;
  let exactProviderCost = 0;
  let hasExactProviderCost = false;
  let webSearchEmitted = false;
  const citations: WebSearchCitation[] = [];
  const sources: WebSearchSource[] = [];

  const MAX_TOOL_ROUNDS = 20;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const toolCalls: Array<{ call_id: string; name: string; arguments: string }> = [];
    const roundTextStart = totalTextLength;
    let roundTextLength = 0;
    let completedResponse: OpenAI.Responses.Response | undefined;

    try {
      const stream = client.responses.stream({
        model,
        input,
        ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
        instructions: systemPrompt || undefined,
        tools: responsesTools.length > 0 ? responsesTools : undefined,
        tool_choice: webSearchEnabled ? "auto" : undefined,
        ...(reasoningEffort && reasoningEffort !== "default"
          ? { reasoning: { effort: reasoningEffort as "low", summary: "detailed" as const } }
          : {}),
        // Search-capable models such as GPT-5.6 Sol may emit reasoning items
        // even when the UI thinking toggle is off. Always retain their opaque
        // encrypted state so our stateless history replay remains valid.
        include: ["reasoning.encrypted_content" as const],
      }, { signal });

      for await (const event of stream) {
        if (signal?.aborted) return;

        switch (event.type) {
          case "response.reasoning_text.delta":
          case "response.reasoning_summary_text.delta":
            yield { type: "thinking", content: event.delta };
            break;
          case "response.output_text.delta":
            roundTextLength += event.delta.length;
            yield { type: "text", content: event.delta };
            break;
          case "response.web_search_call.in_progress":
            if (!webSearchEmitted) {
              webSearchEmitted = true;
              yield { type: "web_search_used" };
            }
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
            completedResponse = event.response;
            const usage = event.response?.usage;
            if (usage) {
              totalInputTokens += usage.input_tokens ?? 0;
              totalOutputTokens += usage.output_tokens ?? 0;
            }
            break;
          }
          case "response.failed":
            yield { type: "error", error: event.response.error?.message || `${providerLabel} response failed` };
            return;
          case "response.incomplete":
            yield {
              type: "error",
              error: `${providerLabel} response incomplete${event.response.incomplete_details?.reason ? `: ${event.response.incomplete_details.reason}` : ""}`,
            };
            return;
          case "error":
            yield { type: "error", error: event.message || `${providerLabel} streaming error` };
            return;
        }
      }
    } catch (error) {
      if (signal?.aborted) return;
      const msg = error instanceof Error ? error.message : String(error);
      yield { type: "error", error: msg };
      return;
    }

    totalTextLength += roundTextLength;
    if (!completedResponse) {
      yield { type: "error", error: `${providerLabel} Responses API completed without a response object` };
      return;
    }

    if (continuationProvider === "xai") {
      const metrics = getXaiResponseMetrics(completedResponse);
      searchRequests += metrics.searchRequests;
      if (metrics.cost !== undefined) {
        exactProviderCost += metrics.cost;
        hasExactProviderCost = true;
      }
      sources.push(...extractXaiWebSearchSources(completedResponse));
      if (metrics.searchRequests > 0 && !webSearchEmitted) {
        webSearchEmitted = true;
        yield { type: "web_search_used" };
      }
    }

    let responseTextOffset = 0;
    for (const item of completedResponse.output) {
      if (item.type === "web_search_call" && item.status === "completed") {
        // Reasoning models can also emit open_page/find_in_page items. Only
        // the search action is a billable search request.
        if (continuationProvider === "openai" && item.action?.type === "search") searchRequests += 1;
        if (!webSearchEmitted) {
          webSearchEmitted = true;
          yield { type: "web_search_used" };
        }
      }
      if (item.type !== "message") continue;
      for (const part of item.content) {
        if (part.type !== "output_text") continue;
        for (const annotation of part.annotations) {
          if (continuationProvider === "openai" && annotation.type === "url_citation") {
            citations.push({
              title: annotation.title,
              url: annotation.url,
              startIndex: roundTextStart + responseTextOffset + annotation.start_index,
              endIndex: roundTextStart + responseTextOffset + annotation.end_index,
            });
          }
        }
        responseTextOffset += part.text.length;
      }
    }

    input.push(...completedResponse.output);
    continuationItems.push(...completedResponse.output);

    // Emit tool calls
    for (const tc of toolCalls) {
      yield {
        type: "tool_call",
        toolCall: { id: tc.call_id, name: tc.name, args: parseToolArguments(tc.arguments) ?? {} },
      };
    }

    if (toolCalls.length === 0) {
      const tokenCost = calculateCost(model, totalInputTokens, totalOutputTokens);
      const estimatedSearchCost = searchRequests * (continuationProvider === "xai"
        ? XAI_WEB_SEARCH_COST_PER_REQUEST
        : WEB_SEARCH_COST_PER_REQUEST);
      const estimatedCost = tokenCost === undefined && searchRequests === 0
        ? undefined
        : (tokenCost ?? 0) + estimatedSearchCost;
      const cost = hasExactProviderCost ? exactProviderCost : estimatedCost;
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
        webSearchSources: sources.length > 0 ? deduplicateWebSearchSources(sources) : undefined,
        providerContinuation: {
          provider: continuationProvider,
          baseUrl: baseUrl.replace(/\/+$/, ""),
          model,
          items: continuationItems,
          ...(continuationProvider === "openai" && completedResponse.id
            ? { responseId: completedResponse.id }
            : {}),
        },
      };
      return;
    }

    // Execute tool calls and add results to the next Responses round.
    const functionOutputs: OpenAI.Responses.ResponseInputItem.FunctionCallOutput[] = [];
    const roundAttachments: import("../types").Attachment[] = [];
    for (const tc of toolCalls) {
      const args = parseToolArguments(tc.arguments) ?? {};
      try {
        const result = await executeToolCall(tc.name, args);
        const cleanResult = withoutToolResultAttachments(result);
        const resultStr = typeof cleanResult === "string" ? cleanResult : JSON.stringify(cleanResult);
        yield { type: "tool_result", toolResult: { toolCallId: tc.call_id, result: cleanResult } };
        const output: OpenAI.Responses.ResponseInputItem.FunctionCallOutput = {
          type: "function_call_output", call_id: tc.call_id, output: resultStr,
        };
        functionOutputs.push(output);
        continuationItems.push(output);
        // Deliberately kept out of continuationItems: those are persisted with
        // the message and replayed, which would store the base64 in the chat
        // file and re-upload it on every later turn.
        roundAttachments.push(...getToolResultAttachments(result));
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const output: OpenAI.Responses.ResponseInputItem.FunctionCallOutput = {
          type: "function_call_output", call_id: tc.call_id, output: JSON.stringify({ error: errMsg }),
        };
        functionOutputs.push(output);
        continuationItems.push(output);
      }
    }

    const toolAttachmentItems: OpenAI.Responses.ResponseInputItem[] = dedupeAttachments(roundAttachments)
      .map(attachment => ({
        type: "message",
        role: "user",
        content: [{
          type: "input_file",
          filename: attachment.name,
          file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
        }],
      }) as unknown as OpenAI.Responses.ResponseInputItem);

    if (continuationProvider === "openai" && completedResponse.id) {
      previousResponseId = completedResponse.id;
      input = [...functionOutputs, ...toolAttachmentItems];
    } else {
      input.push(...functionOutputs, ...toolAttachmentItems);
    }
  }

  yield { type: "error", error: "Maximum tool call rounds exceeded" };
}

/**
 * Stream chat completion with function calling support via OpenAI SDK.
 * When enableThinking is true, uses Responses API first for official OpenAI.
 * A tool-enabled reasoning request must not fall back to Chat Completions:
 * current GPT-5.6 models and GPT-6 Astra use Responses for that combination.
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
  webSearchEnabled?: boolean,
  reasoningEffort?: ReasoningEffort,
): AsyncGenerator<StreamChunk> {
  const client = createClient(baseUrl, apiKey, proxyUrl, proxyBypass);
  const selectedEffort = reasoningEffort && reasoningEffort !== "default" ? reasoningEffort : undefined;
  const useReasoning = enableThinking === true || (selectedEffort !== undefined && selectedEffort !== "none");

  // Native search uses Responses on the official OpenAI and xAI endpoints.
  // Other compatible gateways continue to use Chat Completions.
  const responsesProvider = getOfficialResponsesProvider(baseUrl);
  const requiresResponsesForTools = responsesProvider === "openai"
    && /^(?:gpt-5\.6(?:-|$)|gpt-6-astra(?:-|$))/i.test(model)
    && tools.length > 0;

  // Preserve existing non-search behavior: only OpenAI reasoning requests use
  // Responses automatically, while search forces Responses for OpenAI or xAI.
  const shouldUseResponses = (useReasoning && responsesProvider === "openai")
    || (webSearchEnabled === true && responsesProvider !== null)
    || requiresResponsesForTools;
  if (shouldUseResponses && responsesProvider) {
    let responsesWorked = false;
    let initialResponsesError: StreamChunk | undefined;
    const responsesStream = openaiResponsesStream(
      client, baseUrl, model, messages, tools, systemPrompt, executeToolCall, signal,
      selectedEffort ?? (useReasoning ? "high" : undefined), webSearchEnabled, responsesProvider,
    );
    for await (const chunk of responsesStream) {
      // If Responses API returns an error on the first chunk, fall through to Chat Completions
      if (chunk.type === "error" && !responsesWorked) {
        initialResponsesError = chunk;
        break;
      }
      responsesWorked = true;
      yield chunk;
    }
    if (responsesWorked) return;
    if (webSearchEnabled || requiresResponsesForTools
      || (useReasoning && responsesProvider === "openai" && tools.length > 0)) {
      yield initialResponsesError ?? { type: "error", error: "Native web search request failed" };
      return;
    }
    // Tool-free reasoning requests may still use the legacy fallback.
  }

  const openaiTools = tools.length > 0 ? toOpenAiTools(tools) : undefined;
  const conversationMessages = buildMessages(messages, systemPrompt);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // State for parsing <think> tags in content stream (used by OpenRouter models)
  let inThinkTag = false;
  let tagBuffer = "";
  let hasNativeReasoning = false;
  let retryEmptyAfterRead = false;
  let incompleteRetryCount = 0;

  const MAX_TOOL_ROUNDS = 20;
  const MAX_INCOMPLETE_RETRIES = 3;
  const readToolNames = new Set([
    "read_timeline",
    "read_note",
    "search_notes",
    "list_notes",
    "list_folders",
    "get_active_note_info",
  ]);
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let textContent = "";
    let reasoningContent = "";
    let hasToolCalls = false;
    let finishedWithToolCalls = false;
    const toolCallAccum = new Map<number, { id: string; name: string; arguments: string }>();

    try {
      const stream = await client.chat.completions.create({
        model,
        messages: conversationMessages,
        tools: openaiTools,
        stream: true,
        stream_options: { include_usage: true },
        ...(selectedEffort
          ? { reasoning_effort: selectedEffort as "low" }
          : useReasoning ? { reasoning_effort: "high" as const } : {}),
      }, { signal });

      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];
        const delta = choice?.delta;
        if (choice?.finish_reason === "tool_calls" || choice?.finish_reason === "function_call") {
          finishedWithToolCalls = true;
        }

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
          if (!hasNativeReasoning && responsesProvider !== "openai") {
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
      yield {
        type: "tool_call",
        toolCall: { id: tc.id, name: tc.name, args: parseToolArguments(tc.arguments) ?? {} },
      };
    }

    if (!hasToolCalls) {
      const incompleteToolCall = finishedWithToolCalls && toolCallAccum.size === 0;
      const emptyReadContinuation = retryEmptyAfterRead && textContent.trim().length === 0;
      if (incompleteToolCall || emptyReadContinuation) {
        incompleteRetryCount++;
        if (incompleteRetryCount <= MAX_INCOMPLETE_RETRIES) {
          console.warn(
            `[llm-hub] Server returned an incomplete tool continuation; retrying round (${incompleteRetryCount}/${MAX_INCOMPLETE_RETRIES})`,
          );
          // An incomplete server response is not a tool round. Preserve the
          // current round so retries remain available near the tool-round cap.
          round--;
          continue;
        }
        yield { type: "error", error: "The server repeatedly returned an incomplete response after a read tool result." };
        return;
      }
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
    incompleteRetryCount = 0;
    retryEmptyAfterRead = toolCallEntries.some(tc => readToolNames.has(tc.name));

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
        function: { name: tc.name, arguments: normalizeToolArguments(tc.arguments) },
      })),
    };
    if (reasoningContent) {
      assistantMsg.reasoning_content = reasoningContent;
    }
    conversationMessages.push(assistantMsg as unknown as OpenAI.ChatCompletionMessageParam);

    const toolRoundAttachments: import("src/types").Attachment[] = [];
    for (const tc of toolCallEntries) {
      // A no-argument call arrives as an empty string; parsing it must not be
      // mistaken for a tool failure when every parameter is optional.
      const args = parseToolArguments(tc.arguments) ?? {};
      try {
        const result = await executeToolCall(tc.name, args);
        const cleanResult = withoutToolResultAttachments(result);
        const resultStr = typeof cleanResult === "string" ? cleanResult : JSON.stringify(cleanResult);
        yield { type: "tool_result", toolResult: { toolCallId: tc.id, result: cleanResult } };
        conversationMessages.push({ role: "tool", content: resultStr, tool_call_id: tc.id });
        toolRoundAttachments.push(...getToolResultAttachments(result));
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        conversationMessages.push({ role: "tool", content: JSON.stringify({ error: errMsg }), tool_call_id: tc.id });
      }
    }
    const roundFiles = dedupeAttachments(toolRoundAttachments);
    if (roundFiles.length > 0) {
      conversationMessages.push({
        role: "user",
        content: roundFiles.map(attachment => ({
          type: "file" as const,
          file: {
            filename: attachment.name,
            file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
          },
        })),
      } as unknown as OpenAI.ChatCompletionMessageParam);
    }
  }

  yield { type: "error", error: "Maximum tool call rounds exceeded" };
}
