import { describe, expect, it, vi } from "vitest";
import type { ToolDefinition } from "src/types";
import { CodexVaultMcpBridge } from "./codexVaultMcpBridge";

const tool: ToolDefinition = {
  name: "propose_edit",
  description: "Propose an edit",
  parameters: {
    type: "object",
    properties: { fileName: { type: "string" } },
    required: ["fileName"],
  },
};

describe("CodexVaultMcpBridge", () => {
  it("lists only the tools supplied by the plugin", async () => {
    const bridge = new CodexVaultMcpBridge([tool], vi.fn());
    const result = await bridge.handleRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" });

    expect(result).toEqual({
      tools: [{
        name: "propose_edit",
        description: "Propose an edit",
        inputSchema: tool.parameters,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      }],
    });
  });

  it("marks Obsidian read tools as read-only and idempotent", async () => {
    const readTool: ToolDefinition = { ...tool, name: "read_note" };
    const bridge = new CodexVaultMcpBridge([readTool], vi.fn());
    const result = await bridge.handleRequest({ jsonrpc: "2.0", id: 5, method: "tools/list" });

    expect(result).toMatchObject({ tools: [{ annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    } }] });
  });

  it("routes a mutation through the confirmation executor", async () => {
    const execute = vi.fn().mockResolvedValue({ success: true, applied: true });
    const bridge = new CodexVaultMcpBridge([tool], execute);
    const result = await bridge.handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "propose_edit", arguments: { fileName: "Note.md" } },
    });

    expect(execute).toHaveBeenCalledWith("propose_edit", { fileName: "Note.md" });
    expect(result).toMatchObject({ structuredContent: { applied: true } });
    expect(result).not.toHaveProperty("isError");
  });

  it("reports MCP tool calls to the chat observer", async () => {
    const execute = vi.fn().mockResolvedValue({ success: true, content: "PDF text" });
    const observe = vi.fn();
    const bridge = new CodexVaultMcpBridge([{ ...tool, name: "read_note" }], execute);
    bridge.setToolCallObserver(observe);

    await bridge.handleRequest({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "read_note", arguments: { fileName: "docs/manual.pdf" } },
    });

    expect(observe).toHaveBeenCalledWith(
      "read_note",
      { fileName: "docs/manual.pdf" },
      { success: true, content: "PDF text" },
    );
  });

  it("rejects tools that were not explicitly exposed", async () => {
    const execute = vi.fn();
    const bridge = new CodexVaultMcpBridge([tool], execute);
    const result = await bridge.handleRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "apply_edit", arguments: {} },
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result).toMatchObject({ isError: true });
  });

  it("updates the exposed tools when active skills change", async () => {
    const execute = vi.fn().mockResolvedValue({ success: true });
    const bridge = new CodexVaultMcpBridge([tool], execute);
    const skillTool: ToolDefinition = {
      name: "run_skill_workflow",
      description: "Run an active skill workflow",
      parameters: { type: "object", properties: {} },
    };

    bridge.setTools([tool, skillTool]);
    const result = await bridge.handleRequest({ jsonrpc: "2.0", id: 4, method: "tools/list" });

    expect(result).toMatchObject({
      tools: [
        { name: "propose_edit" },
        { name: "run_skill_workflow" },
      ],
    });
  });
});
