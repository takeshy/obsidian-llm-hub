/**
 * Local LLM Provider
 * Connects to local LLM servers via OpenAI-compatible API
 * Supports: Ollama, LM Studio, vLLM, AnythingLLM, etc.
 *
 * Uses Obsidian's requestUrl for non-streaming requests (bypasses CORS)
 * and Node.js http/https for streaming (bypasses CORS).
 *
 * Ollama uses native /api/chat for streaming (immediate response, real-time thinking).
 * Other frameworks use /v1/chat/completions (OpenAI-compatible SSE).
 */

import { requestUrl } from "obsidian";
import type { Message, StreamChunk, LocalLlmConfig, Attachment } from "../types";
import { parseThinkTags } from "./thinkTagParser";

// OpenAI-compatible multimodal content part
type OpenAiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

// OpenAI-compatible API types
interface OpenAiMessage {
  role: "system" | "user" | "assistant";
  content: string | OpenAiContentPart[];
}

// Ollama message format
interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];  // Base64-encoded image data for vision models
}

interface OpenAiModel {
  id: string;
  object?: string;
}

interface OpenAiModelsResponse {
  data: OpenAiModel[];
}

/** Families that are embedding-only models (not usable for chat) */
const EMBEDDING_FAMILIES = new Set(["nomic-bert", "bert", "snowflake-arctic-embed"]);

/** OpenAI-compatible API path prefix. AnythingLLM uses /v1/openai, others use /v1. */
function openaiPathPrefix(config: LocalLlmConfig): string {
  if (config.framework === "anythingllm") return "/v1/openai";
  return "/v1";
}

/**
 * Verify connection to local LLM server and check available models
 */
export async function verifyLocalLlm(config: LocalLlmConfig): Promise<{
  success: boolean;
  error?: string;
  models?: string[];
}> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    if (config.framework === "ollama") {
      try {
        const ollamaResponse = await requestUrl({
          url: `${config.baseUrl}/api/tags`,
          method: "GET",
        });
        const ollamaData = ollamaResponse.json as {
          models?: { name: string; details?: { families?: string[] } }[];
        };
        const models = (ollamaData.models || [])
          .filter(m => !isEmbeddingModel(m.details?.families) && !isEmbeddingModelByName(m.name))
          .map(m => m.name);
        return { success: true, models };
      } catch {
        return { success: false, error: `Cannot connect to ${config.baseUrl}. Is the server running?` };
      }
    }

    // OpenAI-compatible /v1/models (LM Studio, AnythingLLM, vLLM, etc.)
    try {
      const response = await requestUrl({
        url: `${config.baseUrl}${openaiPathPrefix(config)}/models`,
        method: "GET",
        headers,
      });
      const data = response.json as OpenAiModelsResponse;
      const models = (data.data || [])
        .filter((m: OpenAiModel) => !isEmbeddingModelByName(m.id))
        .map((m: OpenAiModel) => m.id);
      return { success: true, models };
    } catch {
      return { success: false, error: `Cannot connect to ${config.baseUrl}. Is the server running?` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

function isEmbeddingModel(families?: string[]): boolean {
  if (!families) return false;
  return families.some(f => EMBEDDING_FAMILIES.has(f));
}

/** Name patterns that indicate embedding-only models */
const EMBEDDING_NAME_PATTERN = /embed|bge-|e5-|gte-|arctic-embed/i;

function isEmbeddingModelByName(name: string): boolean {
  return EMBEDDING_NAME_PATTERN.test(name);
}

/**
 * Fetch available models from the local LLM server
 */
export async function fetchLocalLlmModels(config: LocalLlmConfig): Promise<string[]> {
  const result = await verifyLocalLlm(config);
  return result.models || [];
}

/**
 * Stream chat completion from a local LLM server.
 * Ollama: uses native /api/chat (NDJSON, immediate streaming).
 * LM Studio / AnythingLLM / vLLM: uses OpenAI-compatible chat/completions (SSE).
 */
export async function* localLlmChatStream(
  config: LocalLlmConfig,
  messages: Message[],
  systemPrompt: string,
  signal?: AbortSignal,
  attachments?: Attachment[],
): AsyncGenerator<StreamChunk> {
  if (config.framework === "ollama") {
    yield* ollamaChatStream(config, messages, systemPrompt, signal, attachments);
  } else {
    yield* openaiChatStream(config, messages, systemPrompt, signal, attachments);
  }
}

/**
 * Stream via Ollama's native /api/chat endpoint (NDJSON format).
 */
async function* ollamaChatStream(
  config: LocalLlmConfig,
  messages: Message[],
  systemPrompt: string,
  signal?: AbortSignal,
  attachments?: Attachment[],
): AsyncGenerator<StreamChunk> {
  const ollamaMessages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
  ];
  for (const msg of messages) {
    ollamaMessages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.llmContent ?? msg.content,
    });
  }

  // Add image attachments to the last user message (Ollama uses images array)
  if (attachments && attachments.length > 0 && ollamaMessages.length > 1) {
    const lastMsg = ollamaMessages[ollamaMessages.length - 1];
    if (lastMsg.role === "user") {
      const imageData = attachments
        .filter(a => a.type === "image")
        .map(a => a.data);
      if (imageData.length > 0) {
        lastMsg.images = imageData;
      }
    }
  }

  const requestBody: Record<string, unknown> = {
    model: config.model,
    messages: ollamaMessages,
    stream: true,
  };

  const options: Record<string, unknown> = {};
  if (config.temperature != null) options.temperature = config.temperature;
  if (config.maxTokens != null) options.num_predict = config.maxTokens;
  if (Object.keys(options).length > 0) requestBody.options = options;

  const body = JSON.stringify(requestBody);
  const url = new URL(`${config.baseUrl}/api/chat`);
  const httpModule = getHttpModule(url.protocol);

  const chunks: StreamChunk[] = [];
  const signal$ = new StreamSignal();
  let streamDone = false;
  let streamError: Error | null = null;

  let inThinkTag = false;
  let tagBuffer = "";
  let hasNativeThinking = false;

  const req = httpModule.request(
    {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        let errorBody = "";
        res.on("data", (chunk: Buffer) => { errorBody += chunk.toString(); });
        res.on("end", () => {
          chunks.push({ type: "error", error: `HTTP ${res.statusCode}: ${errorBody.slice(0, 200) || res.statusMessage}` });
          streamDone = true;
          signal$.notify();
        });
        return;
      }

      let buffer = "";

      res.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed) as {
              message?: {
                content?: string;
                thinking?: string;
              };
              done?: boolean;
              prompt_eval_count?: number;
              eval_count?: number;
            };

            // Thinking via separate field (newer Ollama)
            if (parsed.message?.thinking) {
              hasNativeThinking = true;
              chunks.push({ type: "thinking", content: parsed.message.thinking });
            }

            // Parse content
            const content = parsed.message?.content;
            if (content) {
              if (hasNativeThinking) {
                chunks.push({ type: "text", content });
              } else {
                const thinkParsed = parseThinkTags(content, inThinkTag, tagBuffer);
                inThinkTag = thinkParsed.inThinkTag;
                tagBuffer = thinkParsed.tagBuffer;
                for (const item of thinkParsed.items) {
                  chunks.push(item);
                }
              }
            }

            // Final message with done=true
            if (parsed.done) {
              if (tagBuffer) {
                chunks.push({ type: inThinkTag ? "thinking" : "text", content: tagBuffer });
                tagBuffer = "";
              }
              const usage = (parsed.prompt_eval_count || parsed.eval_count)
                ? {
                    inputTokens: parsed.prompt_eval_count,
                    outputTokens: parsed.eval_count,
                    totalTokens: (parsed.prompt_eval_count || 0) + (parsed.eval_count || 0),
                  }
                : undefined;
              chunks.push({ type: "done", usage });
              streamDone = true;
              signal$.notify();
              return;
            }
          } catch (parseErr) {
            console.warn("[local-llm] Failed to parse Ollama NDJSON:", trimmed.slice(0, 200), parseErr);
          }
        }
        signal$.notify();
      });

      res.on("end", () => {
        if (!streamDone) {
          if (tagBuffer) {
            chunks.push({ type: inThinkTag ? "thinking" : "text", content: tagBuffer });
            tagBuffer = "";
          }
          chunks.push({ type: "done" });
          streamDone = true;
        }
        signal$.notify();
      });

      res.on("error", (err: Error) => {
        streamError = err;
        signal$.notify();
      });
    },
  );

  req.on("error", (err: Error) => {
    streamError = err;
    streamDone = true;
    signal$.notify();
  });

  const onAbort = () => {
    req.destroy();
    streamDone = true;
    signal$.notify();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  req.write(body);
  req.end();

  try {
    while (!streamDone || chunks.length > 0) {
      if (chunks.length > 0) {
        yield chunks.shift()!;
        continue;
      }
      if (streamError !== null) {
        yield { type: "error", error: `Connection failed: ${(streamError as Error).message}` };
        return;
      }
      if (streamDone) break;
      if (signal?.aborted) return;
      const ok = await signal$.wait(STREAM_IDLE_TIMEOUT_MS);
      if (!ok) {
        yield { type: "error", error: "Stream timed out: no data received for 2 minutes" };
        req.destroy();
        return;
      }
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Stream via OpenAI-compatible /v1/chat/completions endpoint (SSE format).
 */
async function* openaiChatStream(
  config: LocalLlmConfig,
  messages: Message[],
  systemPrompt: string,
  signal?: AbortSignal,
  attachments?: Attachment[],
): AsyncGenerator<StreamChunk> {
  const openaiMessages: OpenAiMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of messages) {
    openaiMessages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.llmContent ?? msg.content,
    });
  }

  // Add image attachments to the last user message as multimodal content parts
  if (attachments && attachments.length > 0 && openaiMessages.length > 1) {
    const lastMsg = openaiMessages[openaiMessages.length - 1];
    if (lastMsg.role === "user" && typeof lastMsg.content === "string") {
      const imageAttachments = attachments.filter(a => a.type === "image");
      if (imageAttachments.length > 0) {
        const parts: OpenAiContentPart[] = [
          { type: "text", text: lastMsg.content },
        ];
        for (const att of imageAttachments) {
          parts.push({
            type: "image_url",
            image_url: { url: `data:${att.mimeType};base64,${att.data}` },
          });
        }
        lastMsg.content = parts;
      }
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const requestBody: Record<string, unknown> = {
    model: config.model,
    messages: openaiMessages,
    stream: true,
    ...(config.temperature != null && { temperature: config.temperature }),
    ...(config.maxTokens != null && { max_tokens: config.maxTokens }),
  };

  const body = JSON.stringify(requestBody);

  const url = new URL(`${config.baseUrl}${openaiPathPrefix(config)}/chat/completions`);
  const httpModule = getHttpModule(url.protocol);

  const chunks: StreamChunk[] = [];
  const signal$ = new StreamSignal();
  let streamDone = false;
  let streamError: Error | null = null;

  const req = httpModule.request(
    {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: "POST",
      headers,
    },
    (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        let errorBody = "";
        res.on("data", (chunk: Buffer) => { errorBody += chunk.toString(); });
        res.on("end", () => {
          chunks.push({ type: "error", error: `HTTP ${res.statusCode}: ${errorBody.slice(0, 200) || res.statusMessage}` });
          streamDone = true;
          signal$.notify();
        });
        return;
      }

      let buffer = "";
      let inThinkTag = false;
      let tagBuffer = "";
      let hasNativeReasoning = false;

      res.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            if (tagBuffer) {
              chunks.push({ type: inThinkTag ? "thinking" : "text", content: tagBuffer });
              tagBuffer = "";
            }
            chunks.push({ type: "done" });
            streamDone = true;
            signal$.notify();
            return;
          }

          try {
            const parsed = JSON.parse(data) as {
              choices?: {
                delta?: {
                  content?: string;
                  reasoning_content?: string;
                  reasoning?: string;
                };
                finish_reason?: string | null;
              }[];
              usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
              error?: { message?: string } | string;
              message?: string;
            };

            // Some OpenAI-compatible servers (e.g. llama.cpp / LM Studio) report
            // runtime errors like context-length overflow as HTTP 200 with an
            // `error` field in the SSE payload. Surface those as error chunks.
            if (parsed.error) {
              const errMsg = typeof parsed.error === "string"
                ? parsed.error
                : parsed.error.message || parsed.message || "Unknown streaming error";
              chunks.push({ type: "error", error: errMsg });
              streamDone = true;
              signal$.notify();
              return;
            }

            const choice = parsed.choices?.[0];
            const delta = choice?.delta;

            if (delta && ("reasoning_content" in delta || "reasoning" in delta)) {
              hasNativeReasoning = true;
              const reasoningText = delta.reasoning_content ?? delta.reasoning;
              if (reasoningText) {
                chunks.push({ type: "thinking", content: reasoningText });
              }
            }

            if (delta?.content) {
              if (!hasNativeReasoning) {
                const thinkParsed = parseThinkTags(delta.content, inThinkTag, tagBuffer);
                inThinkTag = thinkParsed.inThinkTag;
                tagBuffer = thinkParsed.tagBuffer;
                for (const item of thinkParsed.items) {
                  chunks.push(item);
                }
              } else {
                chunks.push({ type: "text", content: delta.content });
              }
            }

            if (parsed.usage && (parsed.usage.prompt_tokens || parsed.usage.completion_tokens)) {
              chunks.push({
                type: "done",
                usage: {
                  inputTokens: parsed.usage.prompt_tokens,
                  outputTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens,
                },
              });
              streamDone = true;
              signal$.notify();
              return;
            }
          } catch (parseErr) {
            console.warn("[local-llm] Failed to parse SSE data:", data.slice(0, 200), parseErr);
          }
        }
        signal$.notify();
      });

      res.on("end", () => {
        if (!streamDone) {
          if (tagBuffer) {
            chunks.push({ type: inThinkTag ? "thinking" : "text", content: tagBuffer });
            tagBuffer = "";
          }
          chunks.push({ type: "done" });
          streamDone = true;
        }
        signal$.notify();
      });

      res.on("error", (err: Error) => {
        streamError = err;
        signal$.notify();
      });
    },
  );

  req.on("error", (err: Error) => {
    streamError = err;
    streamDone = true;
    signal$.notify();
  });

  const onAbort = () => {
    req.destroy();
    streamDone = true;
    signal$.notify();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  req.write(body);
  req.end();

  try {
    while (!streamDone || chunks.length > 0) {
      if (chunks.length > 0) {
        yield chunks.shift()!;
        continue;
      }
      if (streamError !== null) {
        yield { type: "error", error: `Connection failed: ${(streamError as Error).message}` };
        return;
      }
      if (streamDone) break;
      if (signal?.aborted) return;
      const ok = await signal$.wait(STREAM_IDLE_TIMEOUT_MS);
      if (!ok) {
        yield { type: "error", error: "Stream timed out: no data received for 2 minutes" };
        req.destroy();
        return;
      }
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

/** Idle timeout for stream chunks (ms). */
const STREAM_IDLE_TIMEOUT_MS = 120_000;

/**
 * Robust signaling queue for bridging Node.js event callbacks to an async generator.
 */
class StreamSignal {
  private version = 0;
  private resolve: (() => void) | null = null;

  notify(): void {
    this.version++;
    const fn = this.resolve;
    this.resolve = null;
    fn?.();
  }

  async wait(timeoutMs: number): Promise<boolean> {
    const vBefore = this.version;
    return new Promise<boolean>((res) => {
      const timer = setTimeout(() => { this.resolve = null; res(false); }, timeoutMs);
      this.resolve = () => { clearTimeout(timer); this.resolve = null; res(true); };
      if (this.version !== vBefore) { clearTimeout(timer); this.resolve = null; res(true); }
    });
  }
}

/** Load Node.js http or https module (desktop only, bypasses CORS). */
function getHttpModule(protocol: string): typeof import("http") {
  const loader =
    (globalThis as unknown as { require?: (id: string) => unknown }).require ||
    (globalThis as unknown as { module?: { require?: (id: string) => unknown } }).module?.require;
  if (!loader) {
    throw new Error("Node.js http module is not available in this environment");
  }
  const moduleName = protocol === "https:" ? "https" : "http";
  return loader(moduleName) as typeof import("http");
}

