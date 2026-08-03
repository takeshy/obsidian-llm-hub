import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import {
  getDiffFullscreenPreference,
  getDiffViewModePreference,
  setDiffFullscreenPreference,
  setDiffViewModePreference,
} from "./diffViewPreference";

function makeApp(initialValues: Record<string, unknown> = {}): {
  app: App;
  storedValues: Map<string, unknown>;
} {
  const storedValues = new Map<string, unknown>(Object.entries(initialValues));

  const app = {
    loadLocalStorage: (key: string) => storedValues.get(key),
    saveLocalStorage: (key: string, value: unknown) => storedValues.set(key, value),
  } as unknown as App;

  return { app, storedValues };
}

describe("diff view preference", () => {
  it("defaults invalid or missing values to split view", () => {
    expect(getDiffViewModePreference(makeApp().app)).toBe("split");
    expect(getDiffViewModePreference(makeApp({ "llm-hub-diff-view-mode": "invalid" }).app)).toBe("split");
  });

  it("restores and saves each supported view mode", () => {
    const { app, storedValues } = makeApp({ "llm-hub-diff-view-mode": "unified" });
    expect(getDiffViewModePreference(app)).toBe("unified");

    setDiffViewModePreference(app, "split");
    expect(storedValues.get("llm-hub-diff-view-mode")).toBe("split");

    setDiffViewModePreference(app, "unified");
    expect(storedValues.get("llm-hub-diff-view-mode")).toBe("unified");
  });
});

describe("diff fullscreen preference", () => {
  it("defaults missing or invalid values to windowed", () => {
    expect(getDiffFullscreenPreference(makeApp().app)).toBe(false);
    expect(getDiffFullscreenPreference(makeApp({ "llm-hub-diff-fullscreen": "invalid" }).app)).toBe(false);
  });

  it("restores boolean and string fullscreen values", () => {
    expect(getDiffFullscreenPreference(makeApp({ "llm-hub-diff-fullscreen": true }).app)).toBe(true);
    expect(getDiffFullscreenPreference(makeApp({ "llm-hub-diff-fullscreen": "true" }).app)).toBe(true);
    expect(getDiffFullscreenPreference(makeApp({ "llm-hub-diff-fullscreen": "false" }).app)).toBe(false);
  });

  it("saves both fullscreen states explicitly", () => {
    const { app, storedValues } = makeApp();

    setDiffFullscreenPreference(app, true);
    expect(storedValues.get("llm-hub-diff-fullscreen")).toBe("true");

    setDiffFullscreenPreference(app, false);
    expect(storedValues.get("llm-hub-diff-fullscreen")).toBe("false");
  });
});
