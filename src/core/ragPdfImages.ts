import { type App, loadPdfJs, TFile } from "obsidian";

export interface RagPdfImage {
  type: "image";
  format: "jpg";
  data_base64: string;
}

interface PdfPage {
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number }; background: string }): { promise: Promise<void> };
  cleanup(): void;
}
interface PdfDocument {
  numPages: number;
  getPage(page: number): Promise<PdfPage>;
  destroy(): Promise<void>;
}

// Bound the complete chunk, rather than judging only its first few pages. The
// pixel budget also keeps TypeSafe's processed-image payload below 32 MiB.
const MAX_PAGES = 16;
const PIXEL_BUDGET = 5_000_000;
const MAX_ENCODED_BYTES = 12 * 1024 * 1024;

/** Render the exact matched range without OCR; null means keep it unfiltered. */
export async function renderRagPdfImages(
  app: App, filePath: string, startPage: number, endPage: number,
): Promise<RagPdfImage[] | null> {
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage)
    || startPage < 1 || endPage < startPage || endPage - startPage + 1 > MAX_PAGES) return null;
  let pdf: PdfDocument | undefined;
  try {
    let data: ArrayBuffer;
    if (filePath.startsWith("/") || /^[A-Z]:\\/i.test(filePath)) {
      const fs = (window as { require?: (id: string) => { promises: { readFile(path: string): Promise<Uint8Array> } } }).require?.("fs");
      if (!fs) return null;
      data = new Uint8Array(await fs.promises.readFile(filePath)).buffer;
    } else {
      const file = app.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) return null;
      data = await app.vault.readBinary(file);
    }
    const pdfJs = await loadPdfJs() as { getDocument(options: { data: ArrayBuffer }): { promise: Promise<PdfDocument> } };
    pdf = await pdfJs.getDocument({ data }).promise;
    if (endPage > pdf.numPages) return null;
    const images: RagPdfImage[] = [];
    let encodedBytes = 0;
    const maxSide = Math.min(1568, Math.floor(Math.sqrt(PIXEL_BUDGET / (endPage - startPage + 1))));
    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const canvas = createEl("canvas");
      try {
        const original = page.getViewport({ scale: 1 });
        if (!(original.width > 0 && original.height > 0)) return null;
        const viewport = page.getViewport({ scale: maxSide / Math.max(original.width, original.height) });
        // White padding satisfies Jev's minimum side (256) and area (78,400),
        // including unusually narrow pages, without distorting the document.
        canvas.width = Math.max(280, Math.min(maxSide, Math.ceil(viewport.width)));
        canvas.height = Math.max(280, Math.min(maxSide, Math.ceil(viewport.height)));
        const context = canvas.getContext("2d");
        if (!context) return null;
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport, background: "white" }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        if (!dataUrl.startsWith("data:image/jpeg;base64,")) return null;
        const base64 = dataUrl.slice("data:image/jpeg;base64,".length);
        encodedBytes += base64.length;
        if (!base64 || encodedBytes > MAX_ENCODED_BYTES) return null;
        images.push({ type: "image", format: "jpg", data_base64: base64 });
      } finally {
        canvas.width = canvas.height = 0;
        page.cleanup();
      }
    }
    return images;
  } catch (error) {
    console.warn(`Failed to render PDF for Jev filtering: ${filePath}`, error);
    return null;
  } finally {
    try { await pdf?.destroy(); } catch (error) {
      console.warn(`Failed to release PDF for Jev filtering: ${filePath}`, error);
    }
  }
}
