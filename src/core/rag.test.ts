import { describe, it, expect, vi } from "vitest";
import {
  buildLocalRagContext,
  _buildFileContextPrefix as buildFileContextPrefix,
  _chunkText as chunkText,
  _cosineSimilarity as cosineSimilarity,
  _extractFrontmatter as extractFrontmatter,
  _keywordSearchScore as keywordSearchScore,
  _simpleChecksum as simpleChecksum,
  _shouldIncludeFile as shouldIncludeFile,
} from "./localRagStore";
import type { FilterConfig, LocalRagSearchResult } from "./localRagStore";
import {
  extensionToMimeType,
  extensionToContentType,
  MULTIMODAL_EXTENSIONS,
  MULTIMODAL_FILE_SIZE_LIMITS,
} from "./embeddingProvider";
import { normalizeExternalRagIndex } from "./localRagStorage";

// API key from environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const MODEL = "gemini-embedding-2-preview";
const hasApiKey = GEMINI_API_KEY.length > 0;

// ── shouldIncludeFile ──────────────────────────────────────────────

describe("shouldIncludeFile", () => {
  it("includes all files when no folders specified", () => {
    const config: FilterConfig = { includeFolders: [], excludePatterns: [] };
    expect(shouldIncludeFile("notes/hello.md", config)).toBe(true);
    expect(shouldIncludeFile("deep/nested/file.md", config)).toBe(true);
  });

  it("filters by include folders", () => {
    const config: FilterConfig = { includeFolders: ["notes"], excludePatterns: [] };
    expect(shouldIncludeFile("notes/hello.md", config)).toBe(true);
    expect(shouldIncludeFile("notes/sub/deep.md", config)).toBe(true);
    expect(shouldIncludeFile("other/file.md", config)).toBe(false);
  });

  it("handles trailing slash in folder names", () => {
    const config: FilterConfig = { includeFolders: ["notes/"], excludePatterns: [] };
    expect(shouldIncludeFile("notes/hello.md", config)).toBe(true);
  });

  it("excludes files matching regex patterns", () => {
    const config: FilterConfig = { includeFolders: [], excludePatterns: ["^templates/", "\\.draft\\.md$"] };
    expect(shouldIncludeFile("templates/template1.md", config)).toBe(false);
    expect(shouldIncludeFile("notes/doc.draft.md", config)).toBe(false);
    expect(shouldIncludeFile("notes/hello.md", config)).toBe(true);
  });

  it("applies both include and exclude together", () => {
    const config: FilterConfig = { includeFolders: ["notes"], excludePatterns: ["secret"] };
    expect(shouldIncludeFile("notes/hello.md", config)).toBe(true);
    expect(shouldIncludeFile("notes/secret.md", config)).toBe(false);
    expect(shouldIncludeFile("other/hello.md", config)).toBe(false);
  });

  it("ignores invalid regex patterns", () => {
    const config: FilterConfig = { includeFolders: [], excludePatterns: ["[invalid"] };
    expect(shouldIncludeFile("notes/hello.md", config)).toBe(true);
  });
});

// ── chunkText ──────────────────────────────────────────────────────

describe("chunkText", () => {
  it("returns empty for empty/whitespace text", () => {
    expect(chunkText("", 100, 20)).toEqual([]);
    expect(chunkText("   ", 100, 20)).toEqual([]);
  });

  it("returns single chunk for short text", () => {
    const result = chunkText("Hello world", 100, 20);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Hello world");
  });

  it("splits text into multiple chunks", () => {
    const text = "A".repeat(300);
    const result = chunkText(text, 100, 0);
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.length).toBeGreaterThan(0);
    }
  });

  it("respects overlap between chunks", () => {
    const text = "word ".repeat(100);
    const chunks = chunkText(text, 100, 30);
    expect(chunks.length).toBeGreaterThan(1);
    const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
    expect(totalLen).toBeGreaterThanOrEqual(text.trim().length);
  });

  it("tries to break at paragraph boundaries", () => {
    const text = "First paragraph content here.\n\nSecond paragraph content here.\n\nThird paragraph.";
    const chunks = chunkText(text, 50, 0);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("tries to break at sentence boundaries", () => {
    const text = "First sentence here. Second sentence here. Third sentence here. Fourth sentence here.";
    const chunks = chunkText(text, 45, 0);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("clamps overlap to be less than chunk size", () => {
    const text = "Hello world test content here";
    const result = chunkText(text, 10, 15);
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles Japanese text", () => {
    const text = "日本語のテスト文章です。これはチャンク分割のテストです。長いテキストを正しく分割できるか確認します。";
    const result = chunkText(text, 30, 5);
    expect(result.length).toBeGreaterThan(0);
    const joined = result.join("");
    for (const char of "日本語のテスト文章です") {
      expect(joined).toContain(char);
    }
  });
});

// ── cosineSimilarity ───────────────────────────────────────────────

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], new Float32Array([1, 2, 3]))).toBeCloseTo(1.0, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], new Float32Array([0, 1]))).toBeCloseTo(0.0, 5);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0, 0], new Float32Array([-1, 0, 0]))).toBeCloseTo(-1.0, 5);
  });

  it("returns 0 for zero vectors", () => {
    expect(cosineSimilarity([0, 0, 0], new Float32Array([1, 2, 3]))).toBe(0);
  });

  it("is invariant to magnitude", () => {
    expect(cosineSimilarity([1, 2, 3], new Float32Array([2, 4, 6]))).toBeCloseTo(1.0, 5);
  });

  it("computes correct similarity for known vectors", () => {
    // cos(45°) = 1/√2 ≈ 0.7071
    expect(cosineSimilarity([1, 1], new Float32Array([1, 0]))).toBeCloseTo(Math.SQRT1_2, 4);
  });
});

// ── simpleChecksum ─────────────────────────────────────────────────

describe("simpleChecksum", () => {
  it("returns same hash for same content", () => {
    expect(simpleChecksum("hello world")).toBe(simpleChecksum("hello world"));
  });

  it("returns different hash for different content", () => {
    expect(simpleChecksum("hello")).not.toBe(simpleChecksum("world"));
  });

  it("returns a string", () => {
    expect(typeof simpleChecksum("test")).toBe("string");
  });

  it("handles empty string", () => {
    expect(simpleChecksum("")).toBe("0");
  });
});

// ── buildLocalRagContext ───────────────────────────────────────────

describe("buildLocalRagContext", () => {
  it("returns empty string for no results", () => {
    expect(buildLocalRagContext([])).toBe("");
  });

  it("formats text results with source and score", () => {
    const results: LocalRagSearchResult[] = [
      { filePath: "notes/test.md", text: "Some content", score: 0.95, chunkIndex: 0 },
    ];
    const ctx = buildLocalRagContext(results);
    expect(ctx).toContain("notes/test.md");
    expect(ctx).toContain("Some content");
    expect(ctx).toContain("0.950");
  });

  it("includes multiple results", () => {
    const results: LocalRagSearchResult[] = [
      { filePath: "a.md", text: "Text A", score: 0.9, chunkIndex: 0 },
      { filePath: "b.md", text: "Text B", score: 0.8, chunkIndex: 1 },
    ];
    const ctx = buildLocalRagContext(results);
    expect(ctx).toContain("Text A");
    expect(ctx).toContain("Text B");
  });

  it("formats image results with original text", () => {
    const results: LocalRagSearchResult[] = [
      { filePath: "images/cat.png", text: "[Image: cat.png]", score: 0.85, chunkIndex: 0, contentType: "image" },
    ];
    const ctx = buildLocalRagContext(results);
    expect(ctx).toContain("[Image: cat.png]");
    expect(ctx).toContain("images/cat.png");
  });

  it("formats mixed content types correctly", () => {
    const results: LocalRagSearchResult[] = [
      { filePath: "notes/test.md", text: "Text content", score: 0.9, chunkIndex: 0, contentType: "text" },
      { filePath: "docs/report.pdf", text: "[Pdf: report.pdf]", score: 0.8, chunkIndex: 0, contentType: "pdf" },
      { filePath: "audio/meeting.mp3", text: "[Audio: meeting.mp3]", score: 0.7, chunkIndex: 0, contentType: "audio" },
      { filePath: "video/demo.mp4", text: "[Video: demo.mp4]", score: 0.6, chunkIndex: 0, contentType: "video" },
    ];
    const ctx = buildLocalRagContext(results);
    expect(ctx).toContain("Text content");
    expect(ctx).toContain("[Pdf: report.pdf]");
    expect(ctx).toContain("[Audio: meeting.mp3]");
    expect(ctx).toContain("[Video: demo.mp4]");
  });

  it("treats undefined contentType as text (backward compat)", () => {
    const results: LocalRagSearchResult[] = [
      { filePath: "notes/old.md", text: "Legacy content", score: 0.9, chunkIndex: 0 },
    ];
    const ctx = buildLocalRagContext(results);
    expect(ctx).toContain("Legacy content");
    expect(ctx).not.toContain("[Text file]");
  });
});

// ── frontmatter helpers ─────────────────────────────────────────────

describe("extractFrontmatter", () => {
  it("extracts YAML frontmatter and returns the remaining body", () => {
    const content = "---\n{\"tags\":[\"obsidian\"],\"aliases\":[\"Vault\"]}\n---\n# Title\nBody";
    const result = extractFrontmatter(content);

    expect(result.frontmatter).toEqual({
      tags: ["obsidian"],
      aliases: ["Vault"],
    });
    expect(result.bodyContent).toBe("# Title\nBody");
  });

  it("keeps the full content when frontmatter parsing fails", () => {
    const content = "---\ntags: [unterminated\n---\n# Title\nBody";
    const result = extractFrontmatter(content);

    expect(result.frontmatter).toEqual({});
    expect(result.bodyContent).toBe(content);
  });

  it("does not strip a leading thematic break that is not valid frontmatter", () => {
    const content = "---\n# Visible heading\nBody";
    const result = extractFrontmatter(content);

    expect(result.frontmatter).toEqual({});
    expect(result.bodyContent).toBe(content);
  });
});

describe("buildFileContextPrefix", () => {
  it("includes file name, folder, tags, and aliases", () => {
    expect(buildFileContextPrefix("notes/topic.md", {
      tags: ["a", "b"],
      aliases: ["Topic"],
    })).toBe("Document: topic | Folder: notes | Tags: a, b | Aliases: Topic");
  });
});

describe("keywordSearchScore", () => {
  it("scores matching text higher than non-matching text", () => {
    const matching = keywordSearchScore("obsidian plugins improve search", ["obsidian", "search"]);
    const nonMatching = keywordSearchScore("typescript compiler options", ["obsidian", "search"]);

    expect(matching).toBeGreaterThan(nonMatching);
    expect(nonMatching).toBe(0);
  });
});

// ── extensionToMimeType ────────────────────────────────────────────

describe("extensionToMimeType", () => {
  it("returns correct MIME types per Gemini Embedding 2 spec", () => {
    expect(extensionToMimeType("png")).toBe("image/png");
    expect(extensionToMimeType("jpg")).toBe("image/jpeg");
    expect(extensionToMimeType("jpeg")).toBe("image/jpeg");
    expect(extensionToMimeType("pdf")).toBe("application/pdf");
    expect(extensionToMimeType("mp3")).toBe("audio/mp3");
    expect(extensionToMimeType("wav")).toBe("audio/wav");
    expect(extensionToMimeType("mp4")).toBe("video/mp4");
    expect(extensionToMimeType("mpeg")).toBe("video/mpeg");
  });

  it("returns null for unsupported extensions", () => {
    expect(extensionToMimeType("txt")).toBeNull();
    expect(extensionToMimeType("md")).toBeNull();
    expect(extensionToMimeType("docx")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(extensionToMimeType("PNG")).toBe("image/png");
    expect(extensionToMimeType("JPG")).toBe("image/jpeg");
  });
});

// ── extensionToContentType ─────────────────────────────────────────

describe("extensionToContentType", () => {
  it("returns correct content types", () => {
    expect(extensionToContentType("md")).toBe("text");
    expect(extensionToContentType("png")).toBe("image");
    expect(extensionToContentType("jpg")).toBe("image");
    expect(extensionToContentType("pdf")).toBe("pdf");
    expect(extensionToContentType("mp3")).toBe("audio");
    expect(extensionToContentType("mp4")).toBe("video");
    expect(extensionToContentType("mpeg")).toBe("video");
  });

  it("defaults to text for unknown extensions", () => {
    expect(extensionToContentType("xyz")).toBe("text");
  });
});

// ── MULTIMODAL_EXTENSIONS / FILE_SIZE_LIMITS ───────────────────────

describe("multimodal constants", () => {
  it("includes mpeg extension", () => {
    expect(MULTIMODAL_EXTENSIONS.has("mpeg")).toBe(true);
  });

  it("does not have size limits for images and PDFs", () => {
    expect(MULTIMODAL_FILE_SIZE_LIMITS["png"]).toBeUndefined();
    expect(MULTIMODAL_FILE_SIZE_LIMITS["jpg"]).toBeUndefined();
    expect(MULTIMODAL_FILE_SIZE_LIMITS["pdf"]).toBeUndefined();
  });

  it("has size limits only for audio and video", () => {
    expect(MULTIMODAL_FILE_SIZE_LIMITS["mp3"]).toBeGreaterThan(0);
    expect(MULTIMODAL_FILE_SIZE_LIMITS["wav"]).toBeGreaterThan(0);
    expect(MULTIMODAL_FILE_SIZE_LIMITS["mp4"]).toBeGreaterThan(0);
    expect(MULTIMODAL_FILE_SIZE_LIMITS["mpeg"]).toBeGreaterThan(0);
  });
});

// ── normalizeExternalRagIndex ─────────────────────────────────────

describe("normalizeExternalRagIndex", () => {
  it("normalizes snake_case external index fields", () => {
    const normalized = normalizeExternalRagIndex({
      meta: [
        {
          file_path: "notes/test.md",
          start_offset: 42,
          text: "External chunk",
          content_type: "text",
        },
      ],
      dimension: 768,
      file_checksums: { "notes/test.md": "abc123" },
      embedding_model: "text-embedding-custom",
      chunk_size: 500,
      chunk_overlap: 100,
      index_multimodal: true,
    });

    expect(normalized.meta).toEqual([
      {
        filePath: "notes/test.md",
        chunkIndex: 42,
        text: "External chunk",
        contentType: "text",
      },
    ]);
    expect(normalized.fileChecksums).toEqual({ "notes/test.md": "abc123" });
    expect(normalized.embeddingModel).toBe("text-embedding-custom");
    expect(normalized.chunkSize).toBe(500);
    expect(normalized.chunkOverlap).toBe(100);
    expect(normalized.indexMultimodal).toBe(true);
  });

  it("falls back to array index when chunk position is missing", () => {
    const normalized = normalizeExternalRagIndex({
      meta: [
        { file_path: "a.md", text: "A" },
        { file_path: "b.md", text: "B" },
      ],
    });

    expect(normalized.meta[0].chunkIndex).toBe(0);
    expect(normalized.meta[1].chunkIndex).toBe(1);
  });
});

// ── Gemini API Integration Tests ───────────────────────────────────
// These tests call the real Gemini API. Set GEMINI_API_KEY env var to run.

describe.skipIf(!hasApiKey)("Gemini Embedding API (integration)", () => {
  // Mock requestUrl to use native fetch (for OpenAI-compatible endpoint tests)
  vi.mock("obsidian", async () => {
    return {
      App: class {},
      TFile: class { path = ""; name = ""; extension = ""; basename = ""; },
      requestUrl: async (options: { url: string; method: string; headers?: Record<string, string>; body?: string }) => {
        const resp = await fetch(options.url, {
          method: options.method,
          headers: options.headers,
          body: options.body,
        });
        const text = await resp.text();
        let json: unknown;
        try { json = JSON.parse(text); } catch { json = null; }
        return {
          status: resp.status,
          text,
          json,
          headers: Object.fromEntries(resp.headers.entries()),
        };
      },
      parseYaml: (text: string) => JSON.parse(text),
      stringifyYaml: (obj: unknown) => JSON.stringify(obj),
    };
  });

  let generateEmbeddings: typeof import("./embeddingProvider").generateEmbeddings;
  let fetchEmbeddingModels: typeof import("./embeddingProvider").fetchEmbeddingModels;
  let generateGeminiNativeEmbeddings: typeof import("./embeddingProvider").generateGeminiNativeEmbeddings;

  it("setup: import embeddingProvider", async () => {
    const mod = await import("./embeddingProvider");
    generateEmbeddings = mod.generateEmbeddings;
    fetchEmbeddingModels = mod.fetchEmbeddingModels;
    generateGeminiNativeEmbeddings = mod.generateGeminiNativeEmbeddings;
  });

  // ── OpenAI-compatible endpoint tests ───

  it("fetchEmbeddingModels returns embedding models from Gemini", async () => {
    const models = await fetchEmbeddingModels(GEMINI_API_KEY);
    expect(models.length).toBeGreaterThan(0);
    for (const m of models) {
      expect(m).toMatch(/embed/i);
    }
  });

  it("generates text embeddings (OpenAI-compat)", async () => {
    const result = await generateEmbeddings(["Hello world"], GEMINI_API_KEY, MODEL);
    expect(result).toHaveLength(1);
    expect(result[0].length).toBeGreaterThan(0);
  });

  it("generates multiple text embeddings (OpenAI-compat)", async () => {
    const result = await generateEmbeddings(["First", "Second", "Third"], GEMINI_API_KEY, MODEL);
    expect(result).toHaveLength(3);
    const dim = result[0].length;
    for (const emb of result) {
      expect(emb.length).toBe(dim);
    }
  });

  it("similar texts have higher cosine similarity than dissimilar ones", async () => {
    const embeddings = await generateEmbeddings(
      ["The cat sat on the mat", "A cat was sitting on a mat", "Quantum computing applications"],
      GEMINI_API_KEY, MODEL
    );
    const simSimilar = cosineSimilarity(embeddings[0], new Float32Array(embeddings[1]));
    const simDifferent = cosineSimilarity(embeddings[0], new Float32Array(embeddings[2]));
    expect(simSimilar).toBeGreaterThan(simDifferent);
    expect(simSimilar).toBeGreaterThan(0.5);
  });

  it("generates embeddings for Japanese text", async () => {
    const result = await generateEmbeddings(["日本語のテストです", "これは別のテキストです"], GEMINI_API_KEY, MODEL);
    expect(result).toHaveLength(2);
    expect(result[0].length).toBeGreaterThan(0);
  });

  // ── Gemini native SDK tests ───

  it("native: generates text embeddings via SDK", async () => {
    const result = await generateGeminiNativeEmbeddings(
      [{ text: "Hello world" }, { text: "Another text" }],
      GEMINI_API_KEY, MODEL
    );
    expect(result).toHaveLength(2);
    expect(result[0].length).toBeGreaterThan(0);
    expect(result[1].length).toBe(result[0].length);
  });

  it("native: generates image embedding from base64 PNG", async () => {
    // 1x1 red PNG
    const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const result = await generateGeminiNativeEmbeddings(
      [{ inlineData: { mimeType: "image/png", data: tinyPng } }],
      GEMINI_API_KEY, MODEL
    );
    expect(result).toHaveLength(1);
    expect(result[0].length).toBeGreaterThan(0);
  });

  it("native: text and image share the same vector space", async () => {
    const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const results = await generateGeminiNativeEmbeddings(
      [{ text: "A red pixel" }, { inlineData: { mimeType: "image/png", data: tinyPng } }],
      GEMINI_API_KEY, MODEL
    );
    expect(results).toHaveLength(2);
    expect(results[0].length).toBe(results[1].length);
    const sim = cosineSimilarity(results[0], new Float32Array(results[1]));
    expect(sim).not.toBeNaN();
  });

  // ── End-to-end RAG simulation ───

  it("e2e: text query finds the most relevant document", async () => {
    const docs = [
      "Obsidian is a powerful note-taking application that uses Markdown files.",
      "TypeScript is a typed superset of JavaScript.",
      "RAG stands for Retrieval Augmented Generation, a technique to enhance LLM responses.",
    ];
    const docEmbeddings = await generateEmbeddings(docs, GEMINI_API_KEY, MODEL);
    const dim = docEmbeddings[0].length;

    const vectors = new Float32Array(docEmbeddings.length * dim);
    for (let i = 0; i < docEmbeddings.length; i++) {
      vectors.set(docEmbeddings[i], i * dim);
    }

    const [queryEmb] = await generateEmbeddings(["What is RAG?"], GEMINI_API_KEY, MODEL);
    const scores = docEmbeddings.map((_, i) => ({
      index: i,
      score: cosineSimilarity(queryEmb, vectors.subarray(i * dim, (i + 1) * dim)),
    }));
    scores.sort((a, b) => b.score - a.score);

    expect(scores[0].index).toBe(2);
    expect(scores[0].score).toBeGreaterThan(0.5);
  });

  it("e2e: multimodal search — text query can find a relevant image", async () => {
    // Index: one text doc + one image (tiny PNG)
    const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

    const textEmb = await generateGeminiNativeEmbeddings(
      [{ text: "Machine learning algorithms for natural language processing" }],
      GEMINI_API_KEY, MODEL
    );
    const imageEmb = await generateGeminiNativeEmbeddings(
      [{ inlineData: { mimeType: "image/png", data: tinyPng } }],
      GEMINI_API_KEY, MODEL
    );

    // Both should produce valid embeddings with the same dimension
    expect(textEmb[0].length).toBe(imageEmb[0].length);

    // Query embedding
    const queryEmb = await generateGeminiNativeEmbeddings(
      [{ text: "Show me an image" }],
      GEMINI_API_KEY, MODEL
    );

    // Verify we can compute similarity across modalities
    const simText = cosineSimilarity(queryEmb[0], new Float32Array(textEmb[0]));
    const simImage = cosineSimilarity(queryEmb[0], new Float32Array(imageEmb[0]));

    expect(simText).not.toBeNaN();
    expect(simImage).not.toBeNaN();
    // Both similarities should be in valid range [-1, 1]
    expect(Math.abs(simText)).toBeLessThanOrEqual(1);
    expect(Math.abs(simImage)).toBeLessThanOrEqual(1);
  });
});
