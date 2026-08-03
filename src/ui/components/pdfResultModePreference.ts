import type { App } from "obsidian";

export type PdfResultMode = "text" | "pdf";

const PDF_RESULT_MODE_KEY = "llm-hub-pdf-result-mode";

/**
 * Default display mode for PDF search results.
 *
 * "text" extracts the PDF text layer with PDF.js, which is useless when the
 * text layer is missing or garbled (scanned documents, broken OCR). Users who
 * index PDFs with Gemini native embeddings match against the rendered pages,
 * so they generally want "pdf" — the choice is remembered per vault.
 */
export function getPdfResultModePreference(app: App): PdfResultMode {
  return app.loadLocalStorage(PDF_RESULT_MODE_KEY) === "pdf" ? "pdf" : "text";
}

export function setPdfResultModePreference(app: App, mode: PdfResultMode): void {
  app.saveLocalStorage(PDF_RESULT_MODE_KEY, mode);
}
