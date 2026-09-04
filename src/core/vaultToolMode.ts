import type { ToolDefinition, VaultToolMode } from "../types";

import { isVaultToolAllowed } from "./tools";

const VAULT_SEARCH_TOOL_NAMES = new Set(["search_notes", "list_notes"]);

/** Apply the per-chat Vault access mode to Obsidian's built-in Vault tools. */
export function filterVaultToolsForMode<T extends Pick<ToolDefinition, "name">>(
  tools: T[],
  mode: VaultToolMode,
): T[] {
  if (mode === "none") return [];
  if (mode === "readOnly") return tools.filter(tool => isVaultToolAllowed(tool.name, mode));
  if (mode === "noSearch") {
    return tools.filter(tool => !VAULT_SEARCH_TOOL_NAMES.has(tool.name));
  }
  return tools;
}
