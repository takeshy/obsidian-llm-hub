import type { WebSearchSettings as ExternalSearchSettings } from "obsidian-llm-hub-common/core";

export type WebSearchMode = "native" | "external";
export type WebSearchSettings = ExternalSearchSettings & { mode?: WebSearchMode };

/** Preserve configured external providers; an old empty default means native. */
export function resolveWebSearchMode(settings: WebSearchSettings): WebSearchMode {
  if (settings.mode === "native" || settings.mode === "external") return settings.mode;
  return settings.provider === "tavily" || settings.provider === "brave" ? "external" : "native";
}
