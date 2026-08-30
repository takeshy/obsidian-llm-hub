import { beforeEach, describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { extractPdfText } from "../vault/search";
import { buildRagPdfTextContext, type RagMediaReference } from "./localRagStore";

vi.mock("../vault/search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../vault/search")>()),
  extractPdfText: vi.fn(),
}));

const app = {} as App;

function pdf(pageLabel: string, needsTextFallback = true): RagMediaReference {
  return { filePath: "Docs/report.pdf", contentType: "pdf", pageLabel, needsTextFallback };
}

describe("buildRagPdfTextContext", () => {
  beforeEach(() => vi.mocked(extractPdfText).mockReset());

  it("does not duplicate PDFs whose extracted chunk text is already in RAG context", async () => {
    const context = await buildRagPdfTextContext(app, [pdf("pages 1-2 of 10", false)]);

    expect(context).toBe("");
    expect(extractPdfText).not.toHaveBeenCalled();
  });

  it("merges overlapping page ranges before extraction", async () => {
    vi.mocked(extractPdfText).mockResolvedValue("merged pages");
    await buildRagPdfTextContext(app, [
      pdf("pages 1-3 of 10"),
      pdf("pages 3-5 of 10"),
      pdf("pages 1-3 of 10"),
    ]);

    expect(extractPdfText).toHaveBeenCalledTimes(1);
    expect(extractPdfText).toHaveBeenCalledWith(app, "Docs/report.pdf", 1, 5);
  });

  it("applies the character limit cumulatively per file", async () => {
    vi.mocked(extractPdfText)
      .mockResolvedValueOnce("AAAAAAAA")
      .mockResolvedValueOnce("BBBBBBBB");
    const context = await buildRagPdfTextContext(app, [
      pdf("pages 1-2 of 10"),
      pdf("pages 5-6 of 10"),
    ], 10);

    expect(extractPdfText).toHaveBeenCalledTimes(2);
    expect(context).toContain("AAAAAAAA");
    expect(context).toContain("BB\n... [PDF text truncated]");
    expect(context).not.toContain("BBBBBBBB");
  });
});
