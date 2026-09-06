import { beforeEach, describe, expect, it } from "vitest";
import { AGENT_PLUGIN_MCP_SCHEMA, AGENT_PLUGIN_SCHEMA, normalizeAgentPluginRepo, parseAgentPluginManifest, parseAgentPluginMcp, resolveAgentPluginMcpServers, configureAgentPluginBase } from "./agentPlugins";

describe("Agent Plugins v1", () => {
  // Installs live under this plugin's own folder, declared at load in plugin.ts.
  beforeEach(() => {
    configureAgentPluginBase(".llm-hub");
  });

  it("validates manifests and skills", () => {
    expect(parseAgentPluginManifest(JSON.stringify({ $schema: AGENT_PLUGIN_SCHEMA, name: "demo-plugin", version: "1.0.0" })).name).toBe("demo-plugin");
    expect(() => parseAgentPluginManifest(JSON.stringify({ $schema: AGENT_PLUGIN_SCHEMA, name: "../demo" }))).toThrow();
  });

  it("accepts supported GitHub repository forms", () => {
    expect(normalizeAgentPluginRepo("https://github.com/owner/repo.git")).toBe("owner/repo");
    expect(normalizeAgentPluginRepo("https://example.com/owner/repo")).toBeNull();
  });

  it("parses MCP servers with isolated plugin paths", () => {
    const result = parseAgentPluginMcp(JSON.stringify({ $schema: AGENT_PLUGIN_MCP_SCHEMA, mcpServers: { local: { type: "stdio", command: "./bin/server", args: ["${PLUGIN_DATA}/db"], cwd: "${PLUGIN_ROOT}" } } }), "demo", "/vault/.llm-hub/agent-plugins/demo", "/vault/.llm-hub/agent-plugin-data/demo");
    expect(result.servers[0]).toMatchObject({ name: "demo.local", command: "/vault/.llm-hub/agent-plugins/demo/bin/server", cwd: "/vault/.llm-hub/agent-plugins/demo", enabled: false });
    expect(result.servers[0].args).toEqual(["/vault/.llm-hub/agent-plugin-data/demo/db"]);
  });

  it("temporarily enables tested MCP servers linked to an active plugin skill", () => {
    const server = { name: "demo.local", transport: "stdio" as const, url: "", command: "demo", enabled: false, toolHints: [], agentPlugin: { pluginName: "demo", serverName: "local" } };
    const installs = [{ name: "demo", repo: "owner/repo", version: "1", sourceType: "branch" as const, sourceRef: "main", commitSha: "a".repeat(40), enabled: true, skillNames: ["review"] }];
    expect(resolveAgentPluginMcpServers([server], [".llm-hub/agent-plugins/demo/skills/review"], installs)[0].enabled).toBe(true);
    expect(resolveAgentPluginMcpServers([{ ...server, toolHints: undefined }], [".llm-hub/agent-plugins/demo/skills/review"], installs)[0].enabled).toBe(false);
    expect(server.enabled).toBe(false);
  });
});
