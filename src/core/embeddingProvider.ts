import { requestUrl } from "obsidian";
import { GoogleGenAI, type Part } from "@google/genai";
import type { RagContentType } from "./localRagStorage";
import { createProxyFetch } from "./proxyFetch";
import { patchGeminiProxy } from "./gemini";

const EMBEDDING_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/embeddings";
const GEMINI_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/openai/models";
const BATCH_SIZE = 32;

interface OpenAiModel {
  id: string;
  object?: string;
}

interface OpenAiModelsResponse {
  data: OpenAiModel[];
}

const EMBEDDING_NAME_PATTERN = /embed|bge-|e5-|gte-|arctic-embed/i;

/** Ollama model family names that are embedding-only */
const EMBEDDING_FAMILIES = new Set(["nomic-bert", "bert", "snowflake-arctic-embed"]);

/** Supported multimodal extensions for embedding */
export const MULTIMODAL_EXTENSIONS = new Set(["png", "jpg", "jpeg", "pdf", "mp3", "wav", "mp4", "mpeg"]);

/**
 * File size limits per extension (bytes).
 * Gemini Embedding 2 has no explicit size limit for images/PDFs.
 * Audio and video have duration limits (80-120s), so we apply generous size limits as a safeguard.
 */
export const MULTIMODAL_FILE_SIZE_LIMITS: Record<string, number> = {
  mp3: 20 * 1024 * 1024,
  wav: 100 * 1024 * 1024,
  mp4: 200 * 1024 * 1024,
  mpeg: 200 * 1024 * 1024,
};

/** Map file extension to MIME type (per Gemini Embedding 2 spec) */
export function extensionToMimeType(ext: string): string | null {
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    pdf: "application/pdf",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    mp4: "video/mp4",
    mpeg: "video/mpeg",
  };
  return map[ext.toLowerCase()] ?? null;
}

/** Map file extension to RAG content type */
export function extensionToContentType(ext: string): RagContentType {
  const map: Record<string, RagContentType> = {
    md: "text",
    png: "image",
    jpg: "image",
    jpeg: "image",
    pdf: "pdf",
    mp3: "audio",
    wav: "audio",
    mp4: "video",
    mpeg: "video",
  };
  return map[ext.toLowerCase()] ?? "text";
}

/**
 * Fetch available embedding models from the server.
 * - When baseUrl is empty: fetches from Gemini API and filters for embedding models.
 * - When baseUrl is set: tries Ollama /api/tags first, then falls back to OpenAI-compatible /v1/models.
 */
/**
 * Fetch a URL, routing through the proxy when configured.
 * Falls back to Obsidian's requestUrl when no proxy is set.
 */
async function proxyAwareGet(url: string, headers: Record<string, string>, proxyUrl?: string, proxyBypass?: string): Promise<{ json: unknown }> {
  if (proxyUrl) {
    const proxyFetch = createProxyFetch(proxyUrl, proxyBypass);
    const resp = await proxyFetch(url, { method: "GET", headers });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    return { json: await resp.json() };
  }
  const resp = await requestUrl({ url, method: "GET", headers });
  return { json: resp.json };
}

export async function fetchEmbeddingModels(
  apiKey: string,
  baseUrl?: string,
  proxyUrl?: string,
  proxyBypass?: string,
): Promise<string[]> {
  if (!baseUrl) {
    // Gemini API: fetch all models and filter by name
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const { json } = await proxyAwareGet(GEMINI_MODELS_URL, headers, proxyUrl, proxyBypass);
    const data = json as OpenAiModelsResponse;
    return (data.data || []).map(m => m.id).filter(name => EMBEDDING_NAME_PATTERN.test(name));
  }

  const normalizedBase = normalizeBaseUrl(baseUrl);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  // Try Ollama /api/tags first (has family info for precise embedding model filtering)
  try {
    const { json } = await proxyAwareGet(`${normalizedBase}/api/tags`, {}, proxyUrl, proxyBypass);
    const ollamaData = json as {
      models?: { name: string; details?: { families?: string[] } }[];
    };
    if (ollamaData.models) {
      return ollamaData.models
        .filter(m => isOllamaEmbeddingModel(m.details?.families) || EMBEDDING_NAME_PATTERN.test(m.name))
        .map(m => m.name);
    }
  } catch {
    // Not Ollama — fall through to OpenAI-compatible
  }

  // OpenRouter: use dedicated embedding models endpoint
  if (normalizedBase.includes("openrouter.ai")) {
    const { json } = await proxyAwareGet(`${normalizedBase}/v1/embeddings/models`, headers, proxyUrl, proxyBypass);
    const data = json as OpenAiModelsResponse;
    return (data.data || []).map(m => m.id);
  }

  // OpenAI-compatible /v1/models (LM Studio, vLLM, etc.)
  const { json } = await proxyAwareGet(`${normalizedBase}/v1/models`, headers, proxyUrl, proxyBypass);
  const data = json as OpenAiModelsResponse;
  return (data.data || []).map(m => m.id).filter(name => EMBEDDING_NAME_PATTERN.test(name));
}

/**
 * Normalize base URL: strip trailing slashes and `/v1` suffix to prevent
 * path doubling (e.g., `https://openrouter.ai/api/v1` + `/v1/models`).
 * Also auto-append `/api` for OpenRouter bare domain URLs.
 */
function normalizeBaseUrl(url: string): string {
  let base = url.replace(/\/+$/, "").replace(/\/v1$/i, "");
  // https://openrouter.ai → https://openrouter.ai/api
  if (/^https?:\/\/openrouter\.ai$/i.test(base)) {
    base += "/api";
  }
  return base;
}

function isOllamaEmbeddingModel(families?: string[]): boolean {
  if (!families) return false;
  return families.some(f => EMBEDDING_FAMILIES.has(f));
}

/**
 * Generate embeddings via OpenAI-compatible /v1/embeddings endpoint (text only).
 * Used for non-Gemini providers (Ollama, LM Studio, etc.) and Gemini text-only mode.
 */
export async function generateEmbeddings(
  texts: string[],
  apiKey: string,
  model: string,
  baseUrl?: string,
  proxyUrl?: string,
  proxyBypass?: string,
): Promise<number[][]> {
  const results: number[][] = [];
  const url = baseUrl
    ? `${normalizeBaseUrl(baseUrl)}/v1/embeddings`
    : EMBEDDING_API_URL;

  const proxyFetch = proxyUrl ? createProxyFetch(proxyUrl, proxyBypass) : null;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };
    const body = JSON.stringify({ model, input: batch });

    let data: { data: Array<{ embedding: number[] }> };
    if (proxyFetch) {
      const resp = await proxyFetch(url, { method: "POST", headers, body });
      if (!resp.ok) {
        const detail = await resp.text().catch(() => "");
        throw new Error(`Embedding API error: ${resp.status} ${detail}`);
      }
      data = await resp.json() as typeof data;
    } else {
      const response = await requestUrl({ url, method: "POST", headers, body });
      if (response.status !== 200) {
        throw new Error(`Embedding API error: ${response.status} ${response.text}`);
      }
      data = response.json as typeof data;
    }

    for (const item of data.data) {
      results.push(item.embedding);
    }
  }

  return results;
}

/**
 * Input for Gemini native multimodal embedding.
 * Each input can be text, or binary data (image/PDF/audio/video).
 */
export interface GeminiEmbeddingInput {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

/**
 * Generate embeddings via Gemini native SDK (supports multimodal inputs).
 * Each input is embedded individually to respect per-request media limits.
 */
export async function generateGeminiNativeEmbeddings(
  inputs: GeminiEmbeddingInput[],
  apiKey: string,
  model: string,
  outputDimensionality?: number,
  proxyUrl?: string,
  proxyBypass?: string,
): Promise<number[][]> {
  const ai = new GoogleGenAI({ apiKey });
  if (proxyUrl) {
    patchGeminiProxy(ai, proxyUrl, proxyBypass);
  }

  // Separate text-only inputs (can be batched) from multimodal inputs (one at a time)
  const textOnlyIndices: number[] = [];
  const multimodalIndices: number[] = [];

  for (let i = 0; i < inputs.length; i++) {
    if (inputs[i].text && !inputs[i].inlineData) {
      textOnlyIndices.push(i);
    } else {
      multimodalIndices.push(i);
    }
  }

  const embeddings = new Array<number[]>(inputs.length);

  // Build config with optional output dimensionality
  const config = outputDimensionality ? { outputDimensionality } : undefined;

  // Batch text-only inputs in chunks of 100 (Gemini batch limit)
  const BATCH_LIMIT = 100;
  for (let start = 0; start < textOnlyIndices.length; start += BATCH_LIMIT) {
    const batchIndices = textOnlyIndices.slice(start, start + BATCH_LIMIT);
    const textContents = batchIndices.map(i => inputs[i].text!);
    const response = await ai.models.embedContent({
      model,
      contents: textContents,
      config,
    });
    if (response.embeddings) {
      for (let i = 0; i < response.embeddings.length; i++) {
        embeddings[batchIndices[i]] = response.embeddings[i].values ?? [];
      }
    }
  }

  // Process multimodal inputs one at a time
  for (const idx of multimodalIndices) {
    const input = inputs[idx];
    const parts: Part[] = [];
    if (input.text) {
      parts.push({ text: input.text });
    }
    if (input.inlineData) {
      parts.push({
        inlineData: {
          mimeType: input.inlineData.mimeType,
          data: input.inlineData.data,
        },
      });
    }

    const response = await ai.models.embedContent({
      model,
      contents: [{ role: "user", parts }],
      config,
    });
    if (response.embeddings && response.embeddings.length > 0) {
      embeddings[idx] = response.embeddings[0].values ?? [];
    } else {
      embeddings[idx] = [];
    }
  }

  return embeddings.map(emb => emb ?? []);
}
