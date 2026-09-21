import { describe, it, expect, vi } from "vitest";
import {
  buildLocalRagContext,
  _chunkText as chunkText,
  _cosineSimilarity as cosineSimilarity,
  _simpleChecksum as simpleChecksum,
  _shouldIncludeFile as shouldIncludeFile,
  isGeminiMultimodalEmbeddingModel,
} from "./localRagStore";
import type { FilterConfig, LocalRagSearchResult } from "./localRagStore";
import {
  extensionToMimeType,
  extensionToContentType,
  MULTIMODAL_EXTENSIONS,
  MULTIMODAL_FILE_SIZE_LIMITS,
} from "./embeddingProvider";
import { normalizeExternalRagIndex } from "./localRagStorage";

// Vitest hoists the Obsidian API mock, so keep it at top level.
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

describe("isGeminiMultimodalEmbeddingModel", () => {
  it("recognizes Gemini Embedding 2 GA and preview model IDs", () => {
    expect(isGeminiMultimodalEmbeddingModel("gemini-embedding-2")).toBe(true);
    expect(isGeminiMultimodalEmbeddingModel("gemini-embedding-2-preview")).toBe(true);
    expect(isGeminiMultimodalEmbeddingModel("models/gemini-embedding-2")).toBe(true);
  });

  it("does not classify local or text-only embedding model IDs as Gemini multimodal", () => {
    expect(isGeminiMultimodalEmbeddingModel("nomic-embed-text")).toBe(false);
    expect(isGeminiMultimodalEmbeddingModel("text-embedding-004")).toBe(false);
  });
});

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

// ── extensionToMimeType ────────────────────────────────────────────

describe("extensionToMimeType", () => {
  it("returns correct MIME types per Gemini Embedding 2 spec", () => {
    expect(extensionToMimeType("png")).toBe("image/png");
    expect(extensionToMimeType("jpg")).toBe("image/jpeg");
    expect(extensionToMimeType("jpeg")).toBe("image/jpeg");
    expect(extensionToMimeType("pdf")).toBe("application/pdf");
    expect(extensionToMimeType("mp3")).toBe("audio/mpeg");
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
        chunkIndex: 0,
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

    expect(normalized.meta[0].chunkIndex).toBe(0); // first chunk of a.md
    expect(normalized.meta[1].chunkIndex).toBe(0); // first chunk of b.md
  });
});
