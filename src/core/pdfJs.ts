import { loadPdfJs } from "obsidian";

export interface PdfJsDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPage>;
}

interface PdfJsPage {
  getTextContent(): Promise<PdfJsTextContent>;
}

interface PdfJsTextContent {
  items: PdfJsTextItem[];
}

interface PdfJsTextItem {
  str?: unknown;
}

interface PdfJsLib {
  getDocument(source: { data: ArrayBuffer }): { promise: Promise<PdfJsDocument> };
}

export async function loadPdfDocument(data: ArrayBuffer): Promise<PdfJsDocument> {
  const pdfjsLib = await loadPdfJs() as PdfJsLib;
  return pdfjsLib.getDocument({ data }).promise;
}

export async function extractPdfPageText(pdf: PdfJsDocument, pageNumber: number): Promise<string> {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  return content.items
    .map(item => typeof item.str === "string" ? item.str : "")
    .join(" ");
}
