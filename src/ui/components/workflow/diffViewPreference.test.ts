import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { getDiffViewModePreference, setDiffViewModePreference } from "./diffViewPreference";

function makeApp(initialValue?: unknown): {
  app: App;
  storedValues: Map<string, unknown>;
} {
  const storedValues = new Map<string, unknown>();
  if (initialValue !== undefined) storedValues.set("llm-hub-diff-view-mode", initialValue);

  const app = {
    loadLocalStorage: (key: string) => storedValues.get(key),
    saveLocalStorage: (key: string, value: unknown) => storedValues.set(key, value),
  } as unknown as App;

  return { app, storedValues };
}

describe("diff view preference", () => {
  it("defaults invalid or missing values to split view", () => {
    expect(getDiffViewModePreference(makeApp().app)).toBe("split");
    expect(getDiffViewModePreference(makeApp("invalid").app)).toBe("split");
  });

  it("restores and saves each supported view mode", () => {
    const { app, storedValues } = makeApp("unified");
    expect(getDiffViewModePreference(app)).toBe("unified");

    setDiffViewModePreference(app, "split");
    expect(storedValues.get("llm-hub-diff-view-mode")).toBe("split");

    setDiffViewModePreference(app, "unified");
    expect(storedValues.get("llm-hub-diff-view-mode")).toBe("unified");
  });
});
