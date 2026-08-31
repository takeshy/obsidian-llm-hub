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

  it("keeps every Vault tool in all mode", () => {
    expect(filterVaultToolsForMode(tools, "all")).toBe(tools);
  });
});
