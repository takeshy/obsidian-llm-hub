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
import {
  runLocalLlmChat,
  fetchChatModels,
} from "obsidian-llm-hub-common/core";
import { verifyOpencodeLocal, opencodeLocalChatStream } from "./opencodeLocalProvider";

const getModelList = async (url: string, headers: Record<string, string>): Promise<unknown> =>
  (await requestUrl({ url, method: "GET", ...(Object.keys(headers).length > 0 ? { headers } : {}) })).json;

/**
 * Verify connection to local LLM server and check available models
 */
export async function verifyLocalLlm(config: LocalLlmConfig): Promise<{
  success: boolean;
  error?: string;
  models?: string[];
}> {
  if (config.framework === "opencode") {
    return await verifyOpencodeLocal(config);
  }
  try {
    const models = await fetchChatModels(
      { baseUrl: config.baseUrl, apiKey: config.apiKey, framework: config.framework },
      getModelList,
    );
    return { success: true, models };
  } catch {
    return { success: false, error: `Cannot connect to ${config.baseUrl}. Is the server running?` };
  }
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
  vaultMcpUrl?: string,
): AsyncGenerator<StreamChunk> {
  if (config.framework === "opencode") {
    yield* opencodeLocalChatStream(config, messages, systemPrompt, signal, attachments, vaultMcpUrl);
    return;
  }
  yield* runLocalLlmChat({ config, messages, systemPrompt, signal, attachments });
}

export { formatStreamIdleTimeoutError, getHttpModule, getStreamIdleTimeoutMs, STREAM_IDLE_TIMEOUT_MS, StreamSignal } from "obsidian-llm-hub-common/core";
