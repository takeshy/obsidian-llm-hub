import { type App, TFile, loadPdfJs } from "obsidian";
import { PDFDocument } from "pdf-lib";
import {
  generateEmbeddings,
  generateGeminiNativeEmbeddings,
  extensionToMimeType,
  extensionToContentType,
  MULTIMODAL_EXTENSIONS,
  MULTIMODAL_FILE_SIZE_LIMITS,
} from "./embeddingProvider";
import {
  type LocalRagIndex,
  type LocalRagChunkMeta,
  type RagContentType,
  loadRagIndex,
  saveRagIndex,
  loadRagVectors,
  saveRagVectors,
  deleteRagIndex,
  createEmptyIndex,
  loadExternalRagIndex,
  loadExternalRagVectors,
} from "./localRagStorage";
import { DEFAULT_GEMINI_EMBEDDING_MODEL, DEFAULT_RAG_SETTING, type RagSetting } from "../types";

const MAX_CHANGED_FILES_PER_SYNC = 50;
const SCAN_YIELD_INTERVAL = 25;

async function yieldToEventLoop(): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 0));
}

function parseExternalIndexPaths(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map(path => path.trim())
    .filter(path => path.length > 0);
}

function mergeLoadedIndexes(items: { index: LocalRagIndex; vectors: Float32Array }[]): {
  index: LocalRagIndex | null;
  vectors: Float32Array | null;
} {
  const compatible = items.filter(({ index, vectors }) =>
    index.dimension > 0 &&
    index.meta.length > 0 &&
    vectors.length >= index.meta.length * index.dimension
  );
  if (compatible.length === 0) return { index: null, vectors: null };

  const dimension = compatible[0].index.dimension;
  const sameDimension = compatible.filter(({ index }) => index.dimension === dimension);
  if (sameDimension.length === 0) return { index: null, vectors: null };

  const meta = sameDimension.flatMap(({ index }) => index.meta);
  const mergedVectors = new Float32Array(meta.length * dimension);
  let offset = 0;
  for (const { index, vectors } of sameDimension) {
    const length = index.meta.length * dimension;
    mergedVectors.set(vectors.subarray(0, length), offset);
    offset += length;
  }

  return {
    index: {
      ...sameDimension[0].index,
      meta,
      dimension,
      fileChecksums: Object.assign({}, ...sameDimension.map(({ index }) => index.fileChecksums)),
    },
    vectors: mergedVectors,
  };
}

interface LocalRagEntry {
  index: LocalRagIndex | null;
  vectors: Float32Array | null;
}

export interface FilterConfig {
  includeFolders: string[];
  excludePatterns: string[];
}

function shouldIncludeFile(filePath: string, config: FilterConfig): boolean {
  // Check include folders (if empty, include all)
  if (config.includeFolders.length > 0) {
    let isInIncludedFolder = false;
    for (const folder of config.includeFolders) {
      const normalizedFolder = folder.replace(/\/$/, "");
      if (
        filePath.startsWith(normalizedFolder + "/") ||
        filePath === normalizedFolder
      ) {
        isInIncludedFolder = true;
        break;
      }
    }
    if (!isInIncludedFolder) {
      return false;
    }
  }

  // Check regex pattern exclusions
  for (const pattern of config.excludePatterns) {
    try {
      const regex = new RegExp(pattern);
      if (regex.test(filePath)) {
        return false;
      }
    } catch {
      // Invalid regex pattern, skip
    }
  }

  return true;
}

export interface LocalRagSearchResult {
  filePath: string;
  text: string;
  score: number;
  chunkIndex: number;
  contentType?: RagContentType;
  pageLabel?: string;
}

export interface LocalRagStatus {
  chunkCount: number;
  fileCount: number;
  dimension: number;
  embeddingModel: string;
}

// Convert ArrayBuffer to base64 (chunk-based to avoid O(n^2) string concatenation)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  }
  return btoa(parts.join(""));
}

// Checksum for binary files using stat info
function binaryChecksum(mtime: number, size: number): string {
  return `${mtime}:${size}`;
}

class LocalRagStore {
  private app: App | null = null;
  private entries = new Map<string, LocalRagEntry>();
  private externalPaths = new Map<string, string>();
  private sourceRagSettings = new Map<string, string[]>();
  workspaceFolder = "LLMHub";

  async load(app: App, settingNames: string[], ragSettings?: Record<string, RagSetting>): Promise<void> {
    this.app = app;
    if (ragSettings) {
      for (const [name, setting] of Object.entries(ragSettings)) {
        if (setting.externalIndexPath) {
          this.externalPaths.set(name, setting.externalIndexPath);
        }
        this.setSourceRagSettings(name, setting.sourceRagSettings);
      }
    }
    for (const settingName of settingNames) {
      await this.ensureLoaded(app, settingName);
    }
  }

  setExternalPath(settingName: string, externalPath: string): void {
    if (externalPath) {
      this.externalPaths.set(settingName, externalPath);
    } else {
      this.externalPaths.delete(settingName);
    }
    // A changed source can affect combined indexes, so reload all cached entries.
    this.clearAll();
  }

  setSourceRagSettings(settingName: string, sourceNames: string[]): void {
    const filtered = sourceNames.filter(sourceName => sourceName && sourceName !== settingName);
    if (filtered.length > 0) {
      this.sourceRagSettings.set(settingName, filtered);
    } else {
      this.sourceRagSettings.delete(settingName);
    }
    this.clearAll();
  }

  async sync(
    app: App,
    settingName: string,
    apiKey: string,
    model: string,
    chunkSize: number,
    chunkOverlap: number,
    pdfChunkPages: number,
    filterConfig: FilterConfig,
    onProgress?: (current: number, total: number, fileName: string, action: "embed" | "skip" | "remove") => void,
    embeddingBaseUrl?: string,
    indexMultimodal = false,
    proxyUrl?: string,
    proxyBypass?: string,
  ): Promise<{ embedded: number; skipped: number; removed: number; errors: string[]; deferredFiles?: number; failedFiles?: string[] }> {
    this.app = app;
    const result = { embedded: 0, skipped: 0, removed: 0, errors: [] as string[] };
    const entry = await this.ensureLoaded(app, settingName);
    let index = entry.index;
    let vectors = entry.vectors;

    // Gemini native mode = no custom baseUrl (uses SDK directly)
    const isGeminiNative = !embeddingBaseUrl;

    // Check if we need full rebuild (model, chunk params, or multimodal setting changed)
    const normalizedPdfChunkPages = Math.min(6, Math.max(1, pdfChunkPages));
    const needsFullRebuild = index !== null && (
      index.embeddingModel !== model ||
      index.chunkSize !== chunkSize ||
      index.chunkOverlap !== chunkOverlap ||
      (index.pdfChunkPages ?? 6) !== normalizedPdfChunkPages ||
      (index.indexMultimodal ?? false) !== indexMultimodal
    );

    if (needsFullRebuild) {
      index = null;
      vectors = null;
    }

    if (!index) {
      index = createEmptyIndex();
    }

    // Determine eligible file extensions
    const isEligibleFile = (f: TFile) => {
      if (f.extension === "md") return true;
      // PDFs: Gemini native uses binary embedding; others use text extraction
      if (indexMultimodal && f.extension === "pdf") return true;
      if (indexMultimodal && isGeminiNative && MULTIMODAL_EXTENSIONS.has(f.extension)) return true;
      return false;
    };

    // Get all eligible files
    const allFiles = app.vault.getFiles().filter(
      (f: TFile) => isEligibleFile(f) && shouldIncludeFile(f.path, filterConfig)
    );

    // Calculate checksums for current files
    const currentChecksums: Record<string, string> = {};
    const contentCache = new Map<string, string>();
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      if (file.extension === "md") {
        const content = await app.vault.read(file);
        currentChecksums[file.path] = simpleChecksum(content);
      } else {
        // Binary files: use stat-based checksum
        const stat = await app.vault.adapter.stat(file.path);
        if (stat) {
          currentChecksums[file.path] = binaryChecksum(stat.mtime, stat.size);
        }
      }
      if ((i + 1) % SCAN_YIELD_INTERVAL === 0) {
        await yieldToEventLoop();
      }
    }

    // Determine which files need updating
    let filesToEmbed: TFile[] = [];
    const filesToKeepSet = new Set<string>();
    const currentFilePaths = new Set(allFiles.map(f => f.path));

    for (const file of allFiles) {
      const existingChecksum = index.fileChecksums[file.path];
      if (existingChecksum && existingChecksum === currentChecksums[file.path]) {
        filesToKeepSet.add(file.path);
      } else {
        filesToEmbed.push(file);
      }
    }

    const deferredFiles = filesToEmbed.slice(MAX_CHANGED_FILES_PER_SYNC);
    filesToEmbed = filesToEmbed.slice(0, MAX_CHANGED_FILES_PER_SYNC);
    for (const file of deferredFiles) {
      if (index.fileChecksums[file.path]) {
        filesToKeepSet.add(file.path);
      }
    }

    // Remove chunks from deleted/changed files
    const filesToEmbedPaths = new Set(filesToEmbed.map(f => f.path));
    const filesToRemove = Object.keys(index.fileChecksums).filter(
      p => !currentFilePaths.has(p) || filesToEmbedPaths.has(p)
    );

    // Build new index from kept files
    const keptMeta: LocalRagChunkMeta[] = [];
    const keptVectorParts: Float32Array[] = [];

    if (vectors && index.dimension > 0) {
      for (let origIdx = 0; origIdx < index.meta.length; origIdx++) {
        const meta = index.meta[origIdx];
        if (filesToKeepSet.has(meta.filePath)) {
          const origStart = origIdx * index.dimension;
          const origEnd = origStart + index.dimension;
          if (origEnd <= vectors.length) {
            keptVectorParts.push(vectors.slice(origStart, origEnd));
            keptMeta.push(meta);
          }
        }
      }
    }

    result.removed = filesToRemove.length;
    result.skipped = filesToKeepSet.size;

    const totalOps = filesToEmbed.length + filesToRemove.length + filesToKeepSet.size;

    // Report skipped/removed files
    const keptPaths = [...filesToKeepSet];
    for (let i = 0; i < keptPaths.length; i++) {
      onProgress?.(i + 1, totalOps, keptPaths[i], "skip");
    }
    for (let i = 0; i < filesToRemove.length; i++) {
      onProgress?.(filesToKeepSet.size + i + 1, totalOps, filesToRemove[i], "remove");
    }

    // Embed new/changed files
    const newMeta: LocalRagChunkMeta[] = [];
    const newVectorParts: Float32Array[] = [];
    const embeddedChecksums: Record<string, string> = {};
    const failedFiles: string[] = [];
    let dimension = index.dimension;
    let currentOp = filesToKeepSet.size + filesToRemove.length;

    for (const file of filesToEmbed) {
      currentOp++;
      onProgress?.(currentOp, totalOps, file.path, "embed");

      try {
        if (file.extension === "md") {
          // Text file: chunk and embed
          const content = contentCache.get(file.path) ?? await app.vault.read(file);
          contentCache.set(file.path, content);
          if (!content) continue;
          const chunks = chunkText(content, chunkSize, chunkOverlap);
          if (chunks.length === 0) continue;

          let embeddings: number[][];
          if (isGeminiNative) {
            embeddings = await generateGeminiNativeEmbeddings(
              chunks.map(text => ({ text })),
              apiKey, model, undefined, proxyUrl, proxyBypass,
            );
          } else {
            embeddings = await generateEmbeddings(chunks, apiKey, model, embeddingBaseUrl, proxyUrl, proxyBypass);
          }

          if (embeddings.length > 0 && embeddings[0].length > 0) {
            dimension = embeddings[0].length;
          }

          for (let i = 0; i < chunks.length; i++) {
            if (embeddings[i] && embeddings[i].length > 0) {
              newMeta.push({ filePath: file.path, chunkIndex: i, text: chunks[i], contentType: "text" });
              newVectorParts.push(new Float32Array(embeddings[i]));
            }
          }
          result.embedded++;
          embeddedChecksums[file.path] = currentChecksums[file.path];
        } else if (file.extension === "pdf") {
          if (isGeminiNative) {
            // Gemini native: embed PDF binary chunks directly
            const sizeLimit = MULTIMODAL_FILE_SIZE_LIMITS[file.extension];
            const stat = await app.vault.adapter.stat(file.path);
            if (!stat || (sizeLimit && stat.size > sizeLimit)) {
              result.errors.push(`${file.path}: file too large (${stat?.size ?? 0} bytes, limit ${sizeLimit ?? 0})`);
              continue;
            }

            const buffer = await app.vault.readBinary(file);
            const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
            const totalPages = pdfDoc.getPageCount();
            const maxPages = normalizedPdfChunkPages;
            let embedded = 0;

            for (let start = 0; start < totalPages; start += maxPages) {
              const end = Math.min(start + maxPages, totalPages);
              const chunkDoc = await PDFDocument.create();
              const pages = await chunkDoc.copyPages(pdfDoc, Array.from({ length: end - start }, (_, i) => start + i));
              for (const page of pages) chunkDoc.addPage(page);
              const chunkBytes = await chunkDoc.save();
              const chunkBase64 = arrayBufferToBase64(chunkBytes.buffer as ArrayBuffer);

              const embeddings = await generateGeminiNativeEmbeddings(
                [{ inlineData: { mimeType: "application/pdf", data: chunkBase64 } }],
                apiKey, model, undefined, proxyUrl, proxyBypass,
              );

              if (embeddings.length > 0 && embeddings[0].length > 0) {
                dimension = embeddings[0].length;
                const pageLabel = `pages ${start + 1}-${end} of ${totalPages}`;
                const label = `[Pdf: ${file.name} (${pageLabel})]`;
                newMeta.push({ filePath: file.path, chunkIndex: start, text: label, contentType: "pdf", pageLabel });
                newVectorParts.push(new Float32Array(embeddings[0]));
                embedded++;
              }
            }

            if (embedded > 0) {
              result.embedded++;
              embeddedChecksums[file.path] = currentChecksums[file.path];
            }
          } else {
            // Non-Gemini: extract text from PDF and embed as text chunks
            const pdfResult = await extractPdfTextWithOffsets(app, file);
            if (!pdfResult) {
              failedFiles.push(file.path);
              embeddedChecksums[file.path] = currentChecksums[file.path];
              continue;
            }

            const chunks = chunkTextWithOffsets(pdfResult.text, chunkSize, chunkOverlap);
            if (chunks.length === 0) {
              failedFiles.push(file.path);
              embeddedChecksums[file.path] = currentChecksums[file.path];
              continue;
            }

            const embeddings = await generateEmbeddings(
              chunks.map(c => c.text), apiKey, model, embeddingBaseUrl, proxyUrl, proxyBypass,
            );

            if (embeddings.length > 0 && embeddings[0].length > 0) {
              dimension = embeddings[0].length;
            }

            for (let i = 0; i < chunks.length; i++) {
              if (embeddings[i] && embeddings[i].length > 0) {
                const pageLabel = computePageLabel(
                  chunks[i].startOffset, chunks[i].startOffset + chunks[i].text.length,
                  pdfResult.pageOffsets, pdfResult.numPages,
                );
                newMeta.push({ filePath: file.path, chunkIndex: i, text: chunks[i].text, contentType: "pdf", pageLabel });
                newVectorParts.push(new Float32Array(embeddings[i]));
              }
            }
            result.embedded++;
            embeddedChecksums[file.path] = currentChecksums[file.path];
          }
        } else {
          // Other multimodal file (image, audio, video): embed as single chunk
          const sizeLimit = MULTIMODAL_FILE_SIZE_LIMITS[file.extension];
          const stat = await app.vault.adapter.stat(file.path);
          if (!stat || (sizeLimit && stat.size > sizeLimit)) {
            failedFiles.push(file.path);
            embeddedChecksums[file.path] = currentChecksums[file.path];
            continue;
          }

          const mimeType = extensionToMimeType(file.extension);
          if (!mimeType) {
            failedFiles.push(file.path);
            embeddedChecksums[file.path] = currentChecksums[file.path];
            continue;
          }

          const buffer = await app.vault.readBinary(file);
          const base64 = arrayBufferToBase64(buffer);
          const contentType = extensionToContentType(file.extension);

          const embeddings = await generateGeminiNativeEmbeddings(
            [{ inlineData: { mimeType, data: base64 } }],
            apiKey, model, undefined, proxyUrl, proxyBypass,
          );

          if (embeddings.length > 0 && embeddings[0].length > 0) {
            dimension = embeddings[0].length;
            const label = `[${contentType.charAt(0).toUpperCase() + contentType.slice(1)}: ${file.name}]`;
            newMeta.push({ filePath: file.path, chunkIndex: 0, text: label, contentType });
            newVectorParts.push(new Float32Array(embeddings[0]));
            result.embedded++;
            embeddedChecksums[file.path] = currentChecksums[file.path];
          } else {
            failedFiles.push(file.path);
            embeddedChecksums[file.path] = currentChecksums[file.path];
          }
        }
      } catch (error) {
        if (file.extension === "pdf" || MULTIMODAL_EXTENSIONS.has(file.extension)) {
          failedFiles.push(file.path);
          embeddedChecksums[file.path] = currentChecksums[file.path];
        } else {
          result.errors.push(`${file.path}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (currentOp % SCAN_YIELD_INTERVAL === 0) {
        await yieldToEventLoop();
      }
    }

    // Merge kept + new
    const allMeta = [...keptMeta, ...newMeta];
    const allVectorParts = [...keptVectorParts, ...newVectorParts];

    // Build combined vectors
    const totalElements = allVectorParts.reduce((sum, v) => sum + v.length, 0);
    const combinedVectors = new Float32Array(totalElements);
    let offset = 0;
    for (const part of allVectorParts) {
      combinedVectors.set(part, offset);
      offset += part.length;
    }

    // Update checksums
    const newChecksums: Record<string, string> = {};
    for (const path of filesToKeepSet) {
      newChecksums[path] = index.fileChecksums[path];
    }
    for (const [path, checksum] of Object.entries(embeddedChecksums)) {
      newChecksums[path] = checksum;
    }

    // Save
    index = {
      meta: allMeta,
      dimension,
      fileChecksums: newChecksums,
      embeddingModel: model,
      chunkSize,
      chunkOverlap,
      pdfChunkPages: normalizedPdfChunkPages,
      indexMultimodal,
    };
    vectors = combinedVectors;
    this.entries.set(settingName, { index, vectors });

    await saveRagIndex(app, settingName, index, this.workspaceFolder);
    await saveRagVectors(app, settingName, vectors, this.workspaceFolder);
    this.clearAll();

    return { ...result, deferredFiles: deferredFiles.length, failedFiles };
  }

  async search(
    settingName: string,
    query: string,
    apiKey: string,
    model: string,
    topK: number,
    embeddingBaseUrl?: string,
    scoreThreshold?: number,
    searchFileExtensions?: string[],
    proxyUrl?: string,
    proxyBypass?: string,
  ): Promise<LocalRagSearchResult[]> {
    if (!this.app) {
      return [];
    }

    const entry = await this.ensureLoaded(this.app, settingName);
    const { index, vectors } = entry;
    if (!index || !vectors || index.meta.length === 0) {
      return [];
    }

    // For external index, use the model stored in the index itself
    const isExternal = this.externalPaths.has(settingName);
    const effectiveModel = isExternal
      ? (index.embeddingModel || (embeddingBaseUrl ? model : DEFAULT_GEMINI_EMBEDDING_MODEL))
      : model;

    // Use Gemini native for query embedding when no custom baseUrl
    // Pass index dimension to match the dimensionality used during indexing
    let queryEmbedding: number[];
    if (!embeddingBaseUrl) {
      const results = await generateGeminiNativeEmbeddings([{ text: query }], apiKey, effectiveModel, index.dimension || undefined, proxyUrl, proxyBypass);
      queryEmbedding = results[0];
    } else {
      const results = await generateEmbeddings([query], apiKey, effectiveModel, embeddingBaseUrl, proxyUrl, proxyBypass);
      queryEmbedding = results[0];
    }
    if (!queryEmbedding) return [];

    const dim = index.dimension;
    const scores: Array<{ index: number; score: number }> = [];

    // Build extension filter set (normalized to lowercase without leading dot)
    const extFilter = searchFileExtensions && searchFileExtensions.length > 0
      ? new Set(searchFileExtensions.map(e => e.replace(/^\./, "").toLowerCase()))
      : null;

    for (let i = 0; i < index.meta.length; i++) {
      // Skip entries that don't match the file extension filter
      if (extFilter) {
        const filePath = index.meta[i].filePath;
        const ext = filePath.substring(filePath.lastIndexOf(".") + 1).toLowerCase();
        if (!extFilter.has(ext)) continue;
      }

      const start = i * dim;
      const end = start + dim;
      if (end > vectors.length) break;

      const docVec = vectors.subarray(start, end);
      const score = cosineSimilarity(queryEmbedding, docVec);
      scores.push({ index: i, score });
    }

    scores.sort((a, b) => b.score - a.score);
    const topResults = scores.slice(0, topK);

    return topResults
      .filter(r => r.score > (scoreThreshold ?? 0))
      .map(r => ({
        filePath: index.meta[r.index].filePath,
        text: index.meta[r.index].text,
        score: r.score,
        chunkIndex: index.meta[r.index].chunkIndex,
        contentType: index.meta[r.index].contentType,
        pageLabel: index.meta[r.index].pageLabel,
      }));
  }

  async clear(app: App, settingName: string): Promise<void> {
    this.app = app;
    this.clearAll();
    await deleteRagIndex(app, settingName, this.workspaceFolder);
  }

  /** Invalidate all in-memory caches (e.g. after workspace folder change). */
  clearAll(): void {
    this.entries.clear();
  }

  async getStatus(app: App, settingName: string): Promise<LocalRagStatus> {
    const entry = await this.ensureLoaded(app, settingName);
    if (!entry.index) {
      return { chunkCount: 0, fileCount: 0, dimension: 0, embeddingModel: "" };
    }
    return {
      chunkCount: entry.index.meta.length,
      fileCount: entry.index.fileChecksums ? Object.keys(entry.index.fileChecksums).length : 0,
      dimension: entry.index.dimension,
      embeddingModel: entry.index.embeddingModel || "",
    };
  }

  /** Return indexed files with per-file chunk counts, sorted by file path. */
  async getIndexedFiles(app: App, settingName: string): Promise<{ filePath: string; chunks: number }[]> {
    const entry = await this.ensureLoaded(app, settingName);
    if (!entry.index) return [];
    const counts = new Map<string, number>();
    for (const filePath of Object.keys(entry.index.fileChecksums ?? {})) {
      counts.set(filePath, 0);
    }
    for (const m of entry.index.meta) {
      counts.set(m.filePath, (counts.get(m.filePath) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([filePath, chunks]) => ({ filePath, chunks }))
      .sort((a, b) => a.filePath.localeCompare(b.filePath));
  }

  /** Keyword search across indexed chunks (no embedding API call needed). */
  async keywordSearch(
    app: App, settingName: string, query: string, topK: number,
    searchFileExtensions?: string[],
  ): Promise<LocalRagSearchResult[]> {
    const entry = await this.ensureLoaded(app, settingName);
    if (!entry.index) return [];

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 0) return [];

    const extFilter = searchFileExtensions && searchFileExtensions.length > 0
      ? new Set(searchFileExtensions.map(e => e.replace(/^\./, "").toLowerCase()))
      : null;

    const scored: Array<{ index: number; score: number }> = [];

    for (let i = 0; i < entry.index.meta.length; i++) {
      const meta = entry.index.meta[i];
      if (extFilter) {
        const ext = meta.filePath.substring(meta.filePath.lastIndexOf(".") + 1).toLowerCase();
        if (!extFilter.has(ext)) continue;
      }

      const textLower = meta.text.toLowerCase();
      let matchCount = 0;
      let totalOccurrences = 0;
      for (const term of terms) {
        let pos = 0;
        let found = false;
        while (true) {
          const idx = textLower.indexOf(term, pos);
          if (idx === -1) break;
          found = true;
          totalOccurrences++;
          pos = idx + term.length;
        }
        if (found) matchCount++;
      }

      if (matchCount === 0) continue;

      // Score: ratio of matched terms * total occurrences normalized by text length
      const termCoverage = matchCount / terms.length;
      const density = totalOccurrences / (textLower.length / 100);
      scored.push({ index: i, score: termCoverage * 0.7 + Math.min(density, 1) * 0.3 });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(r => ({
      filePath: entry.index!.meta[r.index].filePath,
      text: entry.index!.meta[r.index].text,
      score: r.score,
      chunkIndex: entry.index!.meta[r.index].chunkIndex,
      contentType: entry.index!.meta[r.index].contentType,
      pageLabel: entry.index!.meta[r.index].pageLabel,
    }));
  }

  /** Get an adjacent chunk (prev/next) for a given file.
   *  Uses text matching to identify the current chunk (handles duplicate chunkIndex in external RAG). */
  async getAdjacentChunk(
    app: App, settingName: string, filePath: string, chunkText: string, direction: "prev" | "next",
  ): Promise<LocalRagSearchResult | null> {
    const entry = await this.ensureLoaded(app, settingName);
    if (!entry.index) return null;

    // Collect all chunks for this file in index order (natural insertion order)
    const fileChunks: { meta: LocalRagChunkMeta; metaIndex: number }[] = [];
    for (let i = 0; i < entry.index.meta.length; i++) {
      if (entry.index.meta[i].filePath === filePath) {
        fileChunks.push({ meta: entry.index.meta[i], metaIndex: i });
      }
    }

    // Find current chunk by text match
    const currentPos = fileChunks.findIndex(c => c.meta.text === chunkText);
    if (currentPos === -1) return null;

    const targetPos = direction === "prev" ? currentPos - 1 : currentPos + 1;
    if (targetPos < 0 || targetPos >= fileChunks.length) return null;

    const meta = fileChunks[targetPos].meta;
    return {
      filePath: meta.filePath,
      text: meta.text,
      score: 0,
      chunkIndex: meta.chunkIndex,
      contentType: meta.contentType,
      pageLabel: meta.pageLabel,
    };
  }

  private async ensureLoaded(
    app: App,
    settingName: string
  ): Promise<LocalRagEntry> {
    const existing = this.entries.get(settingName);
    if (existing) {
      return existing;
    }

    const externalPath = this.externalPaths.get(settingName);
    const sourceNames = this.sourceRagSettings.get(settingName) ?? [];
    let index: LocalRagIndex | null;
    let vectors: Float32Array | null;
    if (sourceNames.length > 0) {
      const loadedIndexes: { index: LocalRagIndex; vectors: Float32Array }[] = [];
      for (const sourceName of sourceNames) {
        const sourceEntry = await this.ensureLoaded(app, sourceName);
        if (!sourceEntry.index || !sourceEntry.vectors || sourceEntry.index.meta.length === 0) continue;
        loadedIndexes.push({ index: sourceEntry.index, vectors: sourceEntry.vectors });
      }
      ({ index, vectors } = mergeLoadedIndexes(loadedIndexes));
    } else if (externalPath) {
      const loadedIndexes: { index: LocalRagIndex; vectors: Float32Array }[] = [];
      for (const path of parseExternalIndexPaths(externalPath)) {
        const externalIndex = await loadExternalRagIndex(path);
        if (!externalIndex || externalIndex.meta.length === 0 || externalIndex.dimension <= 0) continue;
        const externalVectors = await loadExternalRagVectors(path);
        if (!externalVectors || externalVectors.length < externalIndex.meta.length * externalIndex.dimension) continue;
        loadedIndexes.push({ index: externalIndex, vectors: externalVectors });
      }
      ({ index, vectors } = mergeLoadedIndexes(loadedIndexes));
    } else {
      index = await loadRagIndex(app, settingName, this.workspaceFolder);
      vectors = index && index.meta.length > 0
        ? await loadRagVectors(app, settingName, this.workspaceFolder)
        : null;
    }
    const entry = { index, vectors };
    this.entries.set(settingName, entry);
    return entry;
  }
}

export function buildLocalRagContext(results: LocalRagSearchResult[]): string {
  if (results.length === 0) return "";

  let context = "\n\n--- Relevant context from vault (semantic search) ---\n";
  for (const r of results) {
    context += `\n[Source: ${r.filePath}] (relevance: ${r.score.toFixed(3)})\n${r.text}\n`;
  }
  context += "\n--- End of context ---\n";
  return context;
}

// Chunking: split text into chunks with overlap at paragraph/sentence boundaries.
// Returns offset information for each chunk.
function chunkTextWithOffsets(text: string, chunkSize: number, chunkOverlap: number): { text: string; startOffset: number }[] {
  if (!text.trim()) return [];

  // Clamp overlap to be less than chunk size to ensure forward progress
  const effectiveOverlap = Math.min(chunkOverlap, chunkSize - 1);

  const chunks: { text: string; startOffset: number }[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to break at paragraph boundary
    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf("\n\n", end);
      if (paragraphBreak > start + chunkSize * 0.5) {
        end = paragraphBreak + 2;
      } else {
        // Try sentence boundary
        const sentenceBreak = text.lastIndexOf(". ", end);
        if (sentenceBreak > start + chunkSize * 0.5) {
          end = sentenceBreak + 2;
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push({ text: chunk, startOffset: start });
    }

    const nextStart = end - effectiveOverlap;
    if (nextStart <= start) {
      start = end;
    } else {
      start = nextStart;
    }
  }

  return chunks;
}

function chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  return chunkTextWithOffsets(text, chunkSize, chunkOverlap).map(c => c.text);
}

interface PdfExtractResult {
  text: string;
  numPages: number;
  /** Character offset where each page starts. */
  pageOffsets: number[];
}

/** Extract text from a PDF with page offset tracking for page label computation. */
async function extractPdfTextWithOffsets(app: App, file: TFile): Promise<PdfExtractResult | null> {
  const buffer = await app.vault.readBinary(file);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = content.items.map((item: any) => item.str).join(" ");
    pageTexts.push(text.trim() ? text : "");
  }
  // Join non-empty page texts with "\n" and track the offset of each page
  // in the joined string. Empty pages get the same offset as the next non-empty page.
  const parts: string[] = [];
  const pageOffsets: number[] = [];
  let offset = 0;
  for (let i = 0; i < pageTexts.length; i++) {
    if (pageTexts[i]) {
      if (parts.length > 0) offset++; // "\n" separator
      pageOffsets.push(offset);
      parts.push(pageTexts[i]);
      offset += pageTexts[i].length;
    } else {
      // Empty page: point to current end position (will map to the next non-empty page's content)
      pageOffsets.push(offset);
    }
  }
  if (parts.length === 0) return null;
  return { text: parts.join("\n"), numPages: pdf.numPages, pageOffsets };
}

/** Compute a page label (e.g. "pages 2-5 of 24") for a chunk based on its character offsets. */
function computePageLabel(startOffset: number, endOffset: number, pageOffsets: number[], numPages: number): string {
  let startPage = 1;
  let endPage = 1;
  for (let i = 0; i < pageOffsets.length; i++) {
    if (pageOffsets[i] <= startOffset) startPage = i + 1;
    if (pageOffsets[i] <= endOffset) endPage = i + 1;
  }
  return `pages ${startPage}-${endPage} of ${numPages}`;
}

// Simple string checksum using hash
function simpleChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Cosine similarity between a number array and a Float32Array subarray
function cosineSimilarity(a: number[], b: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dotProduct / denom;
}

/** Multimodal file reference from RAG search (to be loaded by caller and passed to LLM) */
export interface RagMediaReference {
  filePath: string;
  contentType: RagContentType;
  pageLabel?: string;  // e.g. "pages 1-6 of 24" for PDF page extraction
}

export interface LocalRagResult {
  context: string;
  sources: string[];
  /** Non-text files that should be attached to the LLM call for content-based answering */
  mediaReferences: RagMediaReference[];
}

export async function searchLocalRag(
  settingName: string,
  query: string,
  ragSetting: import("src/types").RagSetting,
  fallbackApiKey: string,
  proxyUrl?: string,
  proxyBypass?: string,
): Promise<LocalRagResult> {
  const store = getLocalRagStore();
  const apiKey = ragSetting.embeddingApiKey || fallbackApiKey;
  if (!store || !apiKey) {
    return { context: "", sources: [], mediaReferences: [] };
  }
  const results = await store.search(
    settingName, query, apiKey,
    ragSetting.embeddingModel || (ragSetting.embeddingBaseUrl ? "" : DEFAULT_GEMINI_EMBEDDING_MODEL), ragSetting.topK,
    ragSetting.embeddingBaseUrl || undefined,
    ragSetting.scoreThreshold ?? DEFAULT_RAG_SETTING.scoreThreshold,
    ragSetting.searchFileExtensions,
    proxyUrl, proxyBypass,
  );
  if (results.length === 0) {
    return { context: "", sources: [], mediaReferences: [] };
  }

  // Collect non-text file references for multimodal attachment
  const mediaReferences: RagMediaReference[] = results
    .filter(r => r.contentType && r.contentType !== "text")
    .map(r => ({ filePath: r.filePath, contentType: r.contentType!, pageLabel: r.pageLabel }));

  return {
    context: buildLocalRagContext(results),
    sources: [...new Set(results.map(r => r.filePath))],
    mediaReferences,
  };
}

/**
 * Load RAG media references from vault and convert to Attachment objects.
 * Used by Chat.tsx and workflow command.ts to pass actual file data to the LLM.
 */
export async function loadRagMediaAttachments(
  app: App,
  mediaReferences: RagMediaReference[],
): Promise<import("src/types").Attachment[]> {
  const attachments: import("src/types").Attachment[] = [];

  for (const ref of mediaReferences) {
    try {
      const isAbsolute = ref.filePath.startsWith("/") || /^[A-Z]:\\/i.test(ref.filePath);
      let pdfBytes: Uint8Array | null = null;
      let fileName: string;
      let mimeType: string | null = null;

      if (isAbsolute) {
        // External RAG: read from filesystem using Node.js fs
        const fs = (globalThis as { require?: (id: string) => { promises: { readFile: (p: string) => Promise<Buffer> } } }).require?.("fs");
        const nodePath = (globalThis as { require?: (id: string) => { basename: (p: string) => string; extname: (p: string) => string } }).require?.("path");
        if (!fs || !nodePath) continue;

        const buffer = await fs.promises.readFile(ref.filePath);
        const ext = nodePath.extname(ref.filePath).slice(1).toLowerCase();
        mimeType = extensionToMimeType(ext);
        if (!mimeType) continue;
        fileName = nodePath.basename(ref.filePath);

        if (ref.contentType === "pdf" && ref.pageLabel) {
          pdfBytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        } else {
          attachments.push({
            name: fileName,
            type: ref.contentType,
            mimeType,
            data: arrayBufferToBase64(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer),
          });
          continue;
        }
      } else {
        // Vault-relative path: use Obsidian API
        const file = app.vault.getAbstractFileByPath(ref.filePath);
        if (!(file instanceof TFile)) continue;

        mimeType = extensionToMimeType(file.extension);
        if (!mimeType) continue;
        fileName = file.name;

        if (ref.contentType === "pdf" && ref.pageLabel) {
          const buffer = await app.vault.readBinary(file);
          pdfBytes = new Uint8Array(buffer);
        } else {
          const buffer = await app.vault.readBinary(file);
          attachments.push({
            name: file.name,
            type: ref.contentType,
            mimeType,
            data: arrayBufferToBase64(buffer),
          });
          continue;
        }
      }

      // Extract specific pages from PDF using pageLabel
      if (pdfBytes && ref.pageLabel) {
        const pageRange = parsePageLabel(ref.pageLabel);
        if (pageRange) {
          try {
            const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
            const chunkDoc = await PDFDocument.create();
            const indices = Array.from(
              { length: pageRange.endPage - pageRange.startPage + 1 },
              (_, i) => pageRange.startPage - 1 + i  // Convert 1-based to 0-based
            ).filter(i => i < pdfDoc.getPageCount());
            const pages = await chunkDoc.copyPages(pdfDoc, indices);
            for (const page of pages) chunkDoc.addPage(page);
            const extractedBytes = await chunkDoc.save();
            attachments.push({
              name: fileName,
              type: "pdf",
              mimeType: "application/pdf",
              data: arrayBufferToBase64(extractedBytes.buffer as ArrayBuffer),
            });
          } catch (pdfErr) {
            // PDF page extraction failed (e.g. encrypted PDF) — skip attachment
            // Text content from the index will still be used via buildLocalRagContext()
            console.warn(`PDF page extraction failed for ${ref.filePath}, using text fallback:`, pdfErr);
          }
        }
      }
    } catch (e) {
      console.error(`Failed to load RAG media attachment ${ref.filePath}:`, e);
    }
  }

  return attachments;
}

/**
 * Extract specific pages from a PDF file and return as an Attachment.
 * Reusable by RagSourceModal for "Attach as PDF" action.
 */
export async function extractPdfPages(
  app: App,
  filePath: string,
  pageLabel: string,
): Promise<import("src/types").Attachment | null> {
  const pageRange = parsePageLabel(pageLabel);
  if (!pageRange) return null;

  let pdfBytes: Uint8Array;
  let fileName: string;

  const isAbsolute = filePath.startsWith("/") || /^[A-Z]:\\/i.test(filePath);
  if (isAbsolute) {
    const fs = (globalThis as { require?: (id: string) => { promises: { readFile: (p: string) => Promise<Buffer> } } }).require?.("fs");
    const nodePath = (globalThis as { require?: (id: string) => { basename: (p: string) => string } }).require?.("path");
    if (!fs || !nodePath) return null;
    const buffer = await fs.promises.readFile(filePath);
    pdfBytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    fileName = nodePath.basename(filePath);
  } else {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) return null;
    const buffer = await app.vault.readBinary(file);
    pdfBytes = new Uint8Array(buffer);
    fileName = file.name;
  }

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const chunkDoc = await PDFDocument.create();
  const indices = Array.from(
    { length: pageRange.endPage - pageRange.startPage + 1 },
    (_, i) => pageRange.startPage - 1 + i,
  ).filter(i => i < pdfDoc.getPageCount());
  const pages = await chunkDoc.copyPages(pdfDoc, indices);
  for (const page of pages) chunkDoc.addPage(page);
  const extractedBytes = await chunkDoc.save();

  return {
    name: `${fileName} (${pageLabel})`,
    type: "pdf",
    mimeType: "application/pdf",
    data: arrayBufferToBase64(extractedBytes.buffer as ArrayBuffer),
  };
}

/** Parse page label like "pages 1-6 of 24" into structured data */
function parsePageLabel(label: string): { startPage: number; endPage: number; totalPages: number } | null {
  const match = label.match(/pages?\s+(\d+)\s*-\s*(\d+)\s+of\s+(\d+)/i);
  if (!match) return null;
  return {
    startPage: parseInt(match[1], 10),
    endPage: parseInt(match[2], 10),
    totalPages: parseInt(match[3], 10),
  };
}

// Exported for testing
export { chunkText as _chunkText, cosineSimilarity as _cosineSimilarity, simpleChecksum as _simpleChecksum, shouldIncludeFile as _shouldIncludeFile };

// Singleton
let localRagStoreInstance: LocalRagStore | null = null;

export function getLocalRagStore(): LocalRagStore | null {
  return localRagStoreInstance;
}

export function initLocalRagStore(): LocalRagStore {
  if (!localRagStoreInstance) {
    localRagStoreInstance = new LocalRagStore();
  }
  return localRagStoreInstance;
}

export function resetLocalRagStore(): void {
  localRagStoreInstance = null;
}
