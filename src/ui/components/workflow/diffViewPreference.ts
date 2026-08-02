import type { App } from "obsidian";

export type DiffViewMode = "unified" | "split";

const DIFF_VIEW_MODE_KEY = "llm-hub-diff-view-mode";

export function getDiffViewModePreference(app: App): DiffViewMode {
  return app.loadLocalStorage(DIFF_VIEW_MODE_KEY) === "unified" ? "unified" : "split";
}

export function setDiffViewModePreference(app: App, viewMode: DiffViewMode): void {
  app.saveLocalStorage(DIFF_VIEW_MODE_KEY, viewMode);
}
