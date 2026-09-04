import { describe, expect, it } from "vitest";
import { filterVaultToolsForMode } from "./vaultToolMode";

const tools = [
  { name: "read_note" },
  { name: "search_notes" },
  { name: "list_notes" },
  { name: "propose_edit" },
];

describe("filterVaultToolsForMode", () => {
  it("removes every Vault tool when Vault access is off", () => {
    expect(filterVaultToolsForMode(tools, "none")).toEqual([]);
  });

  it("removes discovery tools in no-search mode", () => {
    expect(filterVaultToolsForMode(tools, "noSearch").map(tool => tool.name))
      .toEqual(["read_note", "propose_edit"]);
  });

  it("removes mutations in read-only mode", () => {
    expect(filterVaultToolsForMode(tools, "readOnly").map(tool => tool.name))
      .toEqual(["read_note", "search_notes", "list_notes"]);
  });

  it("keeps every Vault tool in all mode", () => {
    expect(filterVaultToolsForMode(tools, "all")).toBe(tools);
  });
});

import { getEnabledTools, isVaultToolAllowed } from "./tools";

describe("Vault tool modes", () => {
  const tools = getEnabledTools({ allowWrite: true, allowDelete: true });
  it("exposes only search and read tools in readOnly mode", () => {
    expect(tools.filter(tool => isVaultToolAllowed(tool.name, "readOnly")).map(tool => tool.name).sort()).toEqual([
      "get_active_note_info", "list_folders", "list_notes", "read_note", "read_timeline", "search_notes",
    ]);
  });
  it("preserves existing modes and external tools", () => {
    expect(tools.every(tool => isVaultToolAllowed(tool.name, "all"))).toBe(true);
    expect(tools.some(tool => isVaultToolAllowed(tool.name, "none"))).toBe(false);
    expect(isVaultToolAllowed("create_note", "noSearch")).toBe(true);
    expect(isVaultToolAllowed("search_notes", "noSearch")).toBe(false);
    expect(isVaultToolAllowed("mcp_external_tool", "readOnly")).toBe(true);
    expect(isVaultToolAllowed("run_skill_workflow", "readOnly")).toBe(true);
  });
});
