import { describe, expect, it } from "vitest";
import type { ApiProviderConfig, LocalLlmConfig } from "src/types";
import { resolveApiProviderPdfInputMode, resolveLocalLlmPdfInputMode } from "./pdfInputMode";

function api(type: ApiProviderConfig["type"], pdfInputMode?: ApiProviderConfig["pdfInputMode"]): ApiProviderConfig {
  return { id: "p", name: "p", type, baseUrl: "", apiKey: "", enabledModels: [], availableModels: [], verified: true, enabled: true, pdfInputMode };
}

describe("PDF input mode resolution", () => {
  it("uses native PDF for official document-capable providers in auto mode", () => {
    expect(resolveApiProviderPdfInputMode(api("openai"))).toBe("native");
    expect(resolveApiProviderPdfInputMode(api("anthropic"))).toBe("native");
    expect(resolveApiProviderPdfInputMode(api("gemini"))).toBe("native");
  });

  it("uses extracted text for compatible/custom and local providers in auto mode", () => {
    expect(resolveApiProviderPdfInputMode(api("custom"))).toBe("extract-text");
    expect(resolveLocalLlmPdfInputMode({ id: "l", framework: "vllm", baseUrl: "", model: "" })).toBe("extract-text");
  });

  it("honors explicit overrides", () => {
    expect(resolveApiProviderPdfInputMode(api("custom", "native"))).toBe("native");
    expect(resolveApiProviderPdfInputMode(api("openai", "extract-text"))).toBe("extract-text");
  });
});
