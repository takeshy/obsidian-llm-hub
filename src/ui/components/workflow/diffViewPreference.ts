import type { App } from "obsidian";

export type DiffViewMode = "unified" | "split";

const DIFF_VIEW_MODE_KEY = "llm-hub-diff-view-mode";
const DIFF_FULLSCREEN_KEY = "llm-hub-diff-fullscreen";

export function getDiffViewModePreference(app: App): DiffViewMode {
  return app.loadLocalStorage(DIFF_VIEW_MODE_KEY) === "unified" ? "unified" : "split";
}

export function setDiffViewModePreference(app: App, viewMode: DiffViewMode): void {
  app.saveLocalStorage(DIFF_VIEW_MODE_KEY, viewMode);
}

export function getDiffFullscreenPreference(app: App): boolean {
  const stored: unknown = app.loadLocalStorage(DIFF_FULLSCREEN_KEY);
  return stored === true || stored === "true";
}

export function setDiffFullscreenPreference(app: App, fullscreen: boolean): void {
  // Obsidian clears local storage entries for falsy values, so keep both states
  // as strings to ensure a restored windowed preference is explicit.
  app.saveLocalStorage(DIFF_FULLSCREEN_KEY, fullscreen ? "true" : "false");
}
