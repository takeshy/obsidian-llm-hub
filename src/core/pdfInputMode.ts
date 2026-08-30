import type { ApiProviderConfig, LocalLlmConfig, PdfInputMode } from "src/types";

export function resolveApiProviderPdfInputMode(provider: ApiProviderConfig): Exclude<PdfInputMode, "auto"> {
  if (provider.pdfInputMode && provider.pdfInputMode !== "auto") return provider.pdfInputMode;
  return provider.type === "gemini" || provider.type === "openai" || provider.type === "anthropic"
    ? "native"
    : "extract-text";
}

export function resolveLocalLlmPdfInputMode(config: LocalLlmConfig): Exclude<PdfInputMode, "auto"> {
  return config.pdfInputMode === "native" ? "native" : "extract-text";
}
