import { describe, expect, it } from "vitest";
import { dedupeAttachments, getToolResultAttachments, withoutToolResultAttachments } from "./toolResultAttachments";

describe("tool result attachments", () => {
  const attachment = { name: "report.pdf", type: "pdf" as const, mimeType: "application/pdf", data: "JVBERg==" };

  it("extracts valid attachments", () => {
    expect(getToolResultAttachments({ success: true, attachments: [attachment] })).toEqual([attachment]);
  });

  it("removes binary payloads from the textual result", () => {
    expect(withoutToolResultAttachments({ success: true, content: "attached", attachments: [attachment] }))
      .toEqual({ success: true, content: "attached" });
  });

  it("uploads one source file once per round", () => {
    const first = { ...attachment, sourcePath: "Docs/report.pdf" };
    const second = { ...attachment, sourcePath: "Docs/report.pdf" };
    const other = { ...attachment, name: "other.pdf", sourcePath: "Docs/other.pdf" };

    expect(dedupeAttachments([first, second, other])).toEqual([first, other]);
  });

  it("falls back to the file name when no source path is known", () => {
    expect(dedupeAttachments([attachment, { ...attachment }])).toEqual([attachment]);
  });
});
