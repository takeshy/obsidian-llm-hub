import type { App } from "obsidian";

const INDEX_FILENAME = "index.json";
const VECTORS_FILENAME = "vectors.bin";

export type RagContentType = "text" | "image" | "pdf" | "audio" | "video";

export interface LocalRagChunkMeta {
  filePath: string;
  chunkIndex: number;
  text: string;
  contentType?: RagContentType;  // undefined treated as "text" for backward compat
  pageLabel?: string;  // e.g. "pages 1-6 of 24" for split PDF chunks
}

export interface LocalRagIndex {
  meta: LocalRagChunkMeta[];
  dimension: number;
  fileChecksums: Record<string, string>;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  pdfChunkPages?: number;      // undefined treated as 6 for backward compat
  indexMultimodal?: boolean;  // undefined treated as false for backward compat
  fileFrontmatter?: Record<string, Record<string, unknown>>;  // per-file frontmatter metadata
}

const EMPTY_INDEX: LocalRagIndex = {
  meta: [],
  dimension: 0,
  fileChecksums: {},
  embeddingModel: "",
  chunkSize: 0,
  chunkOverlap: 0,
  pdfChunkPages: 6,
};

function getRagDir(workspaceFolder: string): string {
  return `${workspaceFolder}/rag`;
}

function getSettingDir(workspaceFolder: string, settingName: string): string {
  return `${getRagDir(workspaceFolder)}/${sanitizeSettingName(settingName)}`;
}

function getIndexPath(workspaceFolder: string, settingName: string): string {
  return `${getSettingDir(workspaceFolder, settingName)}/${INDEX_FILENAME}`;
}

function getVectorsPath(workspaceFolder: string, settingName: string): string {
  return `${getSettingDir(workspaceFolder, settingName)}/${VECTORS_FILENAME}`;
}

async function ensureDir(app: App, workspaceFolder: string, dirPath: string): Promise<void> {
  const wsExists = await app.vault.adapter.exists(workspaceFolder);
  if (!wsExists) {
    await app.vault.adapter.mkdir(workspaceFolder);
  }

  const ragDir = getRagDir(workspaceFolder);
  const ragExists = await app.vault.adapter.exists(ragDir);
  if (!ragExists) {
    await app.vault.adapter.mkdir(ragDir);
  }

  const dirExists = await app.vault.adapter.exists(dirPath);
  if (!dirExists) {
    await app.vault.adapter.mkdir(dirPath);
  }
}

export async function loadRagIndex(app: App, settingName: string, workspaceFolder: string): Promise<LocalRagIndex | null> {
  const indexPath = getIndexPath(workspaceFolder, settingName);
  try {
    const exists = await app.vault.adapter.exists(indexPath);
    if (!exists) return null;
    const content = await app.vault.adapter.read(indexPath);
    return JSON.parse(content) as LocalRagIndex;
  } catch {
    return null;
  }
}

export async function saveRagIndex(app: App, settingName: string, index: LocalRagIndex, workspaceFolder: string): Promise<void> {
  const dirPath = getSettingDir(workspaceFolder, settingName);
  await ensureDir(app, workspaceFolder, dirPath);

  const indexPath = getIndexPath(workspaceFolder, settingName);
  await app.vault.adapter.write(indexPath, JSON.stringify(index));
}

export async function loadRagVectors(app: App, settingName: string, workspaceFolder: string): Promise<Float32Array | null> {
  const vectorsPath = getVectorsPath(workspaceFolder, settingName);
  try {
    const exists = await app.vault.adapter.exists(vectorsPath);
    if (!exists) return null;
    const buffer = await app.vault.adapter.readBinary(vectorsPath);
    return new Float32Array(buffer);
  } catch {
    return null;
  }
}

export async function saveRagVectors(app: App, settingName: string, vectors: Float32Array, workspaceFolder: string): Promise<void> {
  const dirPath = getSettingDir(workspaceFolder, settingName);
  await ensureDir(app, workspaceFolder, dirPath);

  const vectorsPath = getVectorsPath(workspaceFolder, settingName);
  await app.vault.adapter.writeBinary(
    vectorsPath,
    vectors.buffer.slice(vectors.byteOffset, vectors.byteOffset + vectors.byteLength) as ArrayBuffer
  );
}

export async function deleteRagIndex(app: App, settingName: string, workspaceFolder: string): Promise<void> {
  const dirPath = getSettingDir(workspaceFolder, settingName);
  const indexPath = getIndexPath(workspaceFolder, settingName);
  const vectorsPath = getVectorsPath(workspaceFolder, settingName);
  try {
    if (await app.vault.adapter.exists(indexPath)) {
      await app.vault.adapter.remove(indexPath);
    }
    if (await app.vault.adapter.exists(vectorsPath)) {
      await app.vault.adapter.remove(vectorsPath);
    }
    if (await app.vault.adapter.exists(dirPath)) {
      await app.vault.adapter.rmdir(dirPath, true);
    }
  } catch {
    // Ignore deletion errors
  }
}

export function createEmptyIndex(): LocalRagIndex {
  return { ...EMPTY_INDEX, meta: [], fileChecksums: {} };
}

export function normalizeExternalRagIndex(raw: unknown): LocalRagIndex {
  const index = raw as Record<string, unknown> | null;
  const metaRaw = Array.isArray(index?.meta) ? index.meta : [];

  return {
    meta: metaRaw.map((item, i) => {
      const meta = item as Record<string, unknown>;
      return {
        filePath: typeof meta.filePath === "string" ? meta.filePath : typeof meta.file_path === "string" ? meta.file_path : "",
        chunkIndex: Number(
          meta.chunkIndex ?? meta.chunk_index ?? meta.start_offset ?? i
        ),
        text: typeof meta.text === "string" ? meta.text : "",
        contentType: (meta.contentType ?? meta.content_type) as RagContentType | undefined,
        pageLabel: typeof meta.pageLabel === "string" ? meta.pageLabel : typeof meta.page_label === "string" ? meta.page_label : undefined,
      };
    }),
    dimension: Number(index?.dimension ?? 0),
    fileChecksums: (index?.fileChecksums ?? index?.file_checksums ?? {}) as Record<string, string>,
    embeddingModel: typeof index?.embeddingModel === "string" ? index.embeddingModel : typeof index?.embedding_model === "string" ? index.embedding_model : "",
    chunkSize: Number(index?.chunkSize ?? index?.chunk_size ?? 0),
    chunkOverlap: Number(index?.chunkOverlap ?? index?.chunk_overlap ?? 0),
    pdfChunkPages: Number(index?.pdfChunkPages ?? index?.pdf_chunk_pages ?? 6),
    indexMultimodal: Boolean(index?.indexMultimodal ?? index?.index_multimodal ?? false),
  };
}

function sanitizeSettingName(settingName: string): string {
  return settingName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Load RAG index from an external (absolute) directory path using Node.js fs.
 */
export async function loadExternalRagIndex(dirPath: string): Promise<LocalRagIndex | null> {
  try {
    const fs = (globalThis as { require?: (id: string) => { promises: { readFile: (p: string, e: string) => Promise<string> } } }).require?.("fs");
    const path = (globalThis as { require?: (id: string) => { join: (...args: string[]) => string } }).require?.("path");
    if (!fs || !path) return null;
    const content = await fs.promises.readFile(path.join(dirPath, INDEX_FILENAME), "utf-8");
    return normalizeExternalRagIndex(JSON.parse(content));
  } catch {
    return null;
  }
}

/**
 * Load RAG vectors from an external (absolute) directory path using Node.js fs.
 */
export async function loadExternalRagVectors(dirPath: string): Promise<Float32Array | null> {
  try {
    const fs = (globalThis as { require?: (id: string) => { promises: { readFile: (p: string) => Promise<Buffer> } } }).require?.("fs");
    const path = (globalThis as { require?: (id: string) => { join: (...args: string[]) => string } }).require?.("path");
    if (!fs || !path) return null;
    const buffer = await fs.promises.readFile(path.join(dirPath, VECTORS_FILENAME));
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  } catch {
    return null;
  }
}
