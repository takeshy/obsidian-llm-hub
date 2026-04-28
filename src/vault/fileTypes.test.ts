import { describe, expect, it } from "vitest";
import {
  compareFileLookupPriority,
  ensureMarkdownExtensionIfMissing,
  getPathExtension,
  hasExplicitExtension,
  isMarkdownPath,
  normalizeLookupTerm,
  splitFileName,
} from "./fileTypes";

function file(path: string, extension: string) {
  return { path, extension } as never;
}

describe("vault file types", () => {
  it("keeps explicit non-markdown extensions", () => {
    expect(ensureMarkdownExtensionIfMissing("boards/diagram.canvas")).toBe("boards/diagram.canvas");
    expect(ensureMarkdownExtensionIfMissing("data/config.json")).toBe("data/config.json");
  });

  it("adds .md only when extension is missing", () => {
    expect(ensureMarkdownExtensionIfMissing("notes/today")).toBe("notes/today.md");
  });

  it("detects explicit extensions from the final path segment", () => {
    expect(hasExplicitExtension("folder.with.dot/file.canvas")).toBe(true);
    expect(hasExplicitExtension("folder.with.dot/file")).toBe(false);
  });

  it("normalizes supported text extensions for fuzzy lookup", () => {
    expect(normalizeLookupTerm("My Folder/Board.canvas")).toBe("my folder/board");
    expect(normalizeLookupTerm("Notes/Plan.md")).toBe("notes/plan");
    expect(normalizeLookupTerm("config.json")).toBe("config");
  });

  it("leaves unsupported extensions intact during lookup normalization", () => {
    expect(normalizeLookupTerm("archive.tar.gz")).toBe("archive.tar.gz");
  });

  it("splits file names into stem and extension", () => {
    expect(splitFileName("diagram.canvas")).toEqual({ stem: "diagram", extension: ".canvas" });
    expect(splitFileName("plain")).toEqual({ stem: "plain", extension: "" });
  });

  it("detects markdown paths for markdown-only behavior", () => {
    expect(getPathExtension("Notes/TODAY.MD")).toBe("md");
    expect(getPathExtension("boards/diagram.canvas")).toBe("canvas");
    expect(getPathExtension("folder.with.dot/file")).toBe("");
    expect(isMarkdownPath("Notes/TODAY.MD")).toBe(true);
    expect(isMarkdownPath("boards/diagram.canvas")).toBe(false);
  });

  it("prefers markdown files only for extensionless lookups", () => {
    const files = [
      file("Plan.canvas", "canvas"),
      file("Folder/Plan.md", "md"),
      file("Plan.json", "json"),
    ];

    expect([...files].sort((a, b) => compareFileLookupPriority(a, b, true)).map((f) => f.path)).toEqual([
      "Folder/Plan.md",
      "Plan.json",
      "Plan.canvas",
    ]);
    expect([...files].sort((a, b) => compareFileLookupPriority(a, b, false)).map((f) => f.path)).toEqual([
      "Plan.json",
      "Plan.canvas",
      "Folder/Plan.md",
    ]);
  });
});
