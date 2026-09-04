import { afterEach, describe, expect, it, vi } from "vitest";
import { McpHttpClient } from "./mcpClient";
import { McpStdioClient } from "./mcpStdioClient";
import { setMcpApprovalHandler } from "./mcpApproval";

vi.mock("obsidian", () => ({ Platform: { isMobile: false } }));

afterEach(() => { setMcpApprovalHandler(undefined); vi.restoreAllMocks(); });

for (const Client of [McpHttpClient, McpStdioClient]) {
  describe(Client.name, () => {
    function createClient() {
      const client = new Client({ name: "Anki", transport: Client === McpStdioClient ? "stdio" : "http", command: "anki", url: "http://localhost", enabled: true });
      vi.spyOn(client, "initialize").mockResolvedValue({ protocolVersion: "2024-11-05", capabilities: {}, serverInfo: { name: "test", version: "1" } });
      const internal = client as unknown as { sendRequest: (method: string, params: unknown) => Promise<unknown> };
      const send = vi.spyOn(internal, "sendRequest").mockResolvedValue({ content: [{ type: "text", text: "OK" }] });
      return { client, send };
    }

    it("never sends a denied tool call", async () => {
      const { client, send } = createClient();
      setMcpApprovalHandler({ getServer: () => undefined, request: async () => "deny", remember: async () => {} });
      await expect(client.callToolWithUi("deleteAll", {})).rejects.toThrow("denied");
      expect(send).not.toHaveBeenCalled();
    });

    it("bypasses approval only for the explicitly exempt workflow call", async () => {
      const { client, send } = createClient();
      const request = vi.fn(async () => "deny" as const);
      setMcpApprovalHandler({ getServer: () => undefined, request, remember: async () => {} });
      await client.callToolWithUi("addCard", { text: "test" }, true);
      expect(request).not.toHaveBeenCalled();
      expect(send).toHaveBeenCalledWith("tools/call", { name: "addCard", arguments: { text: "test" } });
      await expect(client.callToolWithUi("deleteAll", {})).rejects.toThrow("denied");
      expect(send).toHaveBeenCalledTimes(1);
    });
  });
}
