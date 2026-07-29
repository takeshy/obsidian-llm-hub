import { createRequire } from "node:module";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  Platform: { isMobile: false },
}));

const gatekeeperBinary = process.env.MCP_GATEKEEPER_E2E_BINARY;
const gatekeeperPlugin = process.env.MCP_GATEKEEPER_E2E_PLUGIN;

describe.runIf(gatekeeperBinary && gatekeeperPlugin)("McpStdioClient with mcp-gatekeeper", () => {
  beforeAll(() => {
    (window as unknown as { require: NodeRequire }).require = createRequire(import.meta.url);
  });

  it("negotiates MCP 2026-07-28 and lists tools", async () => {
    const { McpStdioClient } = await import("./mcpStdioClient");
    const client = new McpStdioClient({
      name: "gatekeeper-e2e",
      transport: "stdio",
      url: "",
      command: gatekeeperBinary,
      args: [
        "--mode=stdio",
        "--root-dir=/tmp",
        `--plugin-file=${gatekeeperPlugin}`,
      ],
      framing: "newline",
      enabled: true,
    });

    try {
      const initialized = await client.initialize();
      expect(initialized.protocolVersion).toBe("2026-07-28");

      const tools = await client.listTools();
      expect(tools.map((tool) => tool.name)).toContain("ls");
      expect(client.getToolsCacheTtlMs()).toBe(0);
    } finally {
      await client.close();
    }
  });
});
