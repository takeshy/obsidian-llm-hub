import { requestUrl } from "obsidian";
import { GoogleGenAI, type Part } from "@google/genai";
import type { RagContentType } from "./localRagStorage";
import { createProxyFetch } from "./proxyFetch";
import { patchGeminiProxy } from "./gemini";
import {
  authHeaders,
  fetchEmbeddingModels as fetchEmbeddingModelsShared,
  isEmbeddingModelName,
  normalizeServerBaseUrl,
  parseOpenAiModels,
} from "obsidian-llm-hub-common/core";

const EMBEDDING_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/embeddings";
const GEMINI_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/openai/models";
const BATCH_SIZE = 32;

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

/**
 * The embedding models available: Gemini's own listing when no server is
 * configured, and otherwise whatever that server offers.
 */
export async function fetchEmbeddingModels(
  apiKey: string,
  baseUrl?: string,
  proxyUrl?: string,
  proxyBypass?: string,
): Promise<string[]> {
  const get = (url: string, headers: Record<string, string>) =>
    proxyAwareGet(url, headers, proxyUrl, proxyBypass).then(response => response.json);

  if (!baseUrl) {
    // Gemini lists every model it has, embedding or not.
    return parseOpenAiModels(await get(GEMINI_MODELS_URL, authHeaders(apiKey))).filter(isEmbeddingModelName);
  }
  return await fetchEmbeddingModelsShared({ baseUrl, apiKey }, get);
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
    ? `${normalizeServerBaseUrl(baseUrl)}/v1/embeddings`
    : EMBEDDING_API_URL;

  const proxyFetch = proxyUrl ? createProxyFetch(proxyUrl, proxyBypass) : null;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
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
  if (model.includes("gemini-embedding-2")) {
    for (const idx of textOnlyIndices) {
      const response = await ai.models.embedContent({
        model,
        contents: inputs[idx].text!,
        config,
      });
      embeddings[idx] = response.embeddings?.[0]?.values ?? [];
    }
  } else {
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

  return Array.from({ length: inputs.length }, (_, i) => embeddings[i] ?? []);
}
