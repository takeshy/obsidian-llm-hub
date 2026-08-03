import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { getPdfResultModePreference, setPdfResultModePreference } from "./pdfResultModePreference";

function makeApp(initialValue?: unknown): {
  app: App;
  storedValues: Map<string, unknown>;
} {
  const storedValues = new Map<string, unknown>();
  if (initialValue !== undefined) storedValues.set("llm-hub-pdf-result-mode", initialValue);

  const app = {
    loadLocalStorage: (key: string) => storedValues.get(key),
    saveLocalStorage: (key: string, value: unknown) => storedValues.set(key, value),
  } as unknown as App;

  return { app, storedValues };
}

describe("pdf result mode preference", () => {
  it("defaults invalid or missing values to text mode", () => {
    expect(getPdfResultModePreference(makeApp().app)).toBe("text");
    expect(getPdfResultModePreference(makeApp("invalid").app)).toBe("text");
  });

  it("restores and saves each supported mode", () => {
    const { app, storedValues } = makeApp("pdf");
    expect(getPdfResultModePreference(app)).toBe("pdf");

    setPdfResultModePreference(app, "text");
    expect(storedValues.get("llm-hub-pdf-result-mode")).toBe("text");

    setPdfResultModePreference(app, "pdf");
    expect(storedValues.get("llm-hub-pdf-result-mode")).toBe("pdf");
  });
});
