import { describe, expect, it, vi } from "vitest";
import { App, TFile } from "obsidian";
import { findFileByName, readNote, resolveNoteFile } from "./notes";
import { extractPdfText } from "./search";
import { PDFDocument } from "pdf-lib";

vi.mock("./search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./search")>()),
  extractPdfText: vi.fn(async () => "Extracted PDF text"),
}));

function makeFile(path: string, size = 1024): TFile {
  const file = new TFile();
  const name = path.split("/").pop() ?? path;
  const lastDot = name.lastIndexOf(".");
  file.path = path;
  file.name = name;
  file.basename = lastDot > 0 ? name.slice(0, lastDot) : name;
  file.extension = lastDot > 0 ? name.slice(lastDot + 1) : "";
  file.stat = { size, mtime: 0, ctime: 0 };
  return file;
}

function makeApp(files: TFile[], binary = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer): App {
  return {
    vault: {
      getFiles: () => files,
      getAbstractFileByPath: (path: string) => files.find(file => file.path === path) ?? null,
      read: vi.fn(async () => "text content"),
      readBinary: vi.fn(async () => binary),
    },
  } as unknown as App;
}

describe("findFileByName", () => {
  it("prefers markdown when the lookup omits an extension", () => {
    const app = makeApp([
      makeFile("Plan.canvas"),
      makeFile("Plan.md"),
    ]);

    expect(findFileByName(app, "Plan")?.path).toBe("Plan.md");
  });

  it("resolves explicit non-markdown extensions", () => {
    const app = makeApp([
      makeFile("Plan.md"),
      makeFile("Plan.canvas"),
    ]);

    expect(findFileByName(app, "Plan.canvas")?.path).toBe("Plan.canvas");
  });

  it("resolves Obsidian Base files", () => {
    const app = makeApp([makeFile("Dashboards/Projects.base")]);

    expect(findFileByName(app, "Projects.base")?.path).toBe("Dashboards/Projects.base");
  });

  it("resolves Dashboard files", () => {
    const app = makeApp([makeFile("Dashboards/Projects.dashboard")]);

    expect(findFileByName(app, "Projects.dashboard")?.path).toBe("Dashboards/Projects.dashboard");
  });
});

describe("readNote PDF support", () => {
  it("extracts PDF text without changing the legacy text-file result shape", async () => {
    const pdf = makeFile("Docs/report.pdf");
    const result = await readNote(makeApp([pdf]), pdf.path, false, 1000, "extract-text");

    expect(result).toEqual({
      success: true,
      content: "Extracted PDF text",
      path: pdf.path,
      truncated: false,
    });
  });

  it("passes the selected page range to PDF text extraction", async () => {
    const pdf = makeFile("Docs/report.pdf");
    await readNote(makeApp([pdf]), pdf.path, false, 1000, "extract-text", 3, 7);

    expect(extractPdfText).toHaveBeenLastCalledWith(expect.anything(), pdf.path, 3, 7);
  });

  it("returns the selected range as result metadata", async () => {
    const pdf = makeFile("Docs/report.pdf");

    const result = await readNote(makeApp([pdf]), pdf.path, false, 1000, "extract-text", 42, 43);

    expect(result).toEqual(expect.objectContaining({ startPage: 42, endPage: 43 }));
  });

  it("returns a native PDF attachment when requested", async () => {
    const pdf = makeFile("Docs/report.pdf");
    const result = await readNote(makeApp([pdf]), pdf.path, false, 1000, "native");

    expect(result.success).toBe(true);
    expect(result.attachments).toEqual([expect.objectContaining({
      name: "report.pdf",
      type: "pdf",
      mimeType: "application/pdf",
      sourcePath: pdf.path,
    })]);
    expect(result.attachments?.[0].data).toBe("JVBERg==");
  });

  it("tells the model a native attachment does not survive the turn", async () => {
    const pdf = makeFile("Docs/report.pdf");
    const result = await readNote(makeApp([pdf]), pdf.path, false, 1000, "native");

    expect(result.content).toContain("for this turn");
    expect(result.content).toContain("read_note again");
  });

  it("attaches only the selected pages in native PDF mode", async () => {
    const source = await PDFDocument.create();
    source.addPage();
    source.addPage();
    source.addPage();
    const bytes = await source.save();
    const pdf = makeFile("Docs/report.pdf", bytes.byteLength);

    const result = await readNote(
      makeApp([pdf], bytes.buffer as ArrayBuffer), pdf.path, false, 1000, "native", 2, 3,
    );

    expect(result.success).toBe(true);
    expect(result.content).toContain("pages 2-3");
    const attached = Uint8Array.from(atob(result.attachments![0].data), character => character.charCodeAt(0));
    expect((await PDFDocument.load(attached)).getPageCount()).toBe(2);
  });

  it("rejects invalid PDF page ranges", async () => {
    const pdf = makeFile("Docs/report.pdf");

    const result = await readNote(makeApp([pdf]), pdf.path, false, 1000, "extract-text", 5, 2);

    expect(result.success).toBe(false);
    expect(result.error).toContain("less than or equal");
  });

  it("falls back to text extraction when a native PDF is too large to send", async () => {
    const pdf = makeFile("Docs/huge.pdf", 40 * 1024 * 1024);
    const result = await readNote(makeApp([pdf]), pdf.path, false, 1000, "native");

    expect(result.attachments).toBeUndefined();
    expect(result.content).toBe("Extracted PDF text");
  });

  it("explains when a scanned PDF has no extractable text", async () => {
    vi.mocked(extractPdfText).mockResolvedValueOnce(null);
    const pdf = makeFile("Docs/scanned.pdf");
    const result = await readNote(makeApp([pdf]), pdf.path, false, 1000, "extract-text");

    expect(result.success).toBe(false);
    expect(result.error).toContain("no extractable text");
    expect(result.error).toContain("native PDF input");
  });
});

describe("resolveNoteFile", () => {
  it("finds a PDF referenced by name only", () => {
    const app = makeApp([makeFile("Private/secret.pdf")]);

    expect(resolveNoteFile(app, "secret.pdf")?.path).toBe("Private/secret.pdf");
  });

  it("resolves the same target readNote reads, so scope checks cannot be bypassed", async () => {
    const app = makeApp([makeFile("Private/secret.pdf")]);
    const resolved = resolveNoteFile(app, "secret.pdf");
    const result = await readNote(app, "secret.pdf", false, 1000, "extract-text");

    expect(result.path).toBe(resolved?.path);
  });
});

describe("readNote non-text files", () => {
  it("reads Obsidian Base files as text", async () => {
    const base = makeFile("Dashboards/Projects.base");
    const app = makeApp([base]);
    vi.mocked(app.vault.read).mockResolvedValueOnce("views:\n  - type: table");

    const result = await readNote(app, base.path);

    expect(result).toEqual({
      success: true,
      content: "views:\n  - type: table",
      path: base.path,
      truncated: false,
    });
  });

  it("reads Dashboard files as text", async () => {
    const dashboard = makeFile("Dashboards/Projects.dashboard");
    const app = makeApp([dashboard]);
    vi.mocked(app.vault.read).mockResolvedValueOnce("layout:\n  type: grid");

    const result = await readNote(app, dashboard.path);

    expect(result).toEqual({
      success: true,
      content: "layout:\n  type: grid",
      path: dashboard.path,
      truncated: false,
    });
  });

  it("refuses binaries that are not PDFs instead of returning mojibake", async () => {
    const png = makeFile("Assets/photo.png");
    const result = await readNote(makeApp([png]), png.path, false, 1000, "extract-text");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not a readable note");
  });
});
