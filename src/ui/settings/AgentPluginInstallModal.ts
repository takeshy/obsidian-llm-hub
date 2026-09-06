import { Modal, Notice, Platform, Setting } from "obsidian";
import { createMcpClient } from "src/core/mcpClient";
import type { AgentPluginPreview } from "src/core/agentPlugins";
import type { McpServerConfig } from "src/types";
import { formatError } from "obsidian-llm-hub-common/core";

export class AgentPluginInstallModal extends Modal {
  private installed = false;
  constructor(
    app: import("obsidian").App,
    private preview: AgentPluginPreview,
    private servers: McpServerConfig[],
    private prepareInstall: () => Promise<void>,
    private onInstall: (testedServers: McpServerConfig[]) => Promise<void>,
  ) { super(app); }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: `Install ${this.preview.manifest.name}` });
    contentEl.createEl("p", { text: this.preview.manifest.description ?? "" });
    new Setting(contentEl).setName("Version").setDesc(`${this.preview.version} · ${this.preview.sourceType}: ${this.preview.sourceRef} · ${this.preview.commitSha.slice(0, 7)}`);
    new Setting(contentEl).setName("Repository").setDesc(this.preview.repo);
    new Setting(contentEl).setName("Agent skills").setDesc(this.preview.skills.map(skill => skill.name).join(", ") || "None");
    new Setting(contentEl).setName("MCP servers").setDesc(this.servers.map(server => server.name).join(", ") || "None");
    if (this.preview.warnings.length) contentEl.createEl("p", { cls: "setting-item-description", text: this.preview.warnings.join(" ") });

    const statusEl = contentEl.createDiv({ cls: "llm-hub-agent-plugin-test-results" });
    const actions = new Setting(contentEl);
    let closeButton: import("obsidian").ButtonComponent | null = null;
    actions.addButton(button => { closeButton = button; button.setButtonText("Cancel").onClick(() => this.close()); });
    actions.addButton(button => button.setButtonText(this.servers.length ? "Test MCP and install" : "Install").setCta().onClick(() => { void (async () => {
      if (this.installed) { this.close(); return; }
      button.setDisabled(true); statusEl.empty();
      try {
        await this.prepareInstall();
        const tested: McpServerConfig[] = [];
        for (const server of this.servers) {
          const row = statusEl.createDiv({ cls: "setting-item-description" });
          row.setText(`Testing ${server.name}...`);
          if (server.transport === "stdio" && Platform.isMobile) {
            row.setText(`${server.name}: skipped (stdio requires desktop Obsidian)`);
            tested.push({ ...server, enabled: false, toolHints: undefined });
            continue;
          }
          const client = createMcpClient({ ...server, enabled: true });
          try {
            await client.initialize();
            const tools = await client.listTools();
            const names = tools.map(tool => tool.name);
            row.setText(`${server.name}: connected · ${names.length} tool(s)${names.length ? ` · ${names.join(", ")}` : ""}`);
            row.addClass("llm-hub-mcp-status--success");
            tested.push({ ...server, enabled: false, toolHints: names });
          } catch (error) {
            row.setText(`${server.name}: connection failed · ${formatError(error)}`);
            row.addClass("llm-hub-mcp-status--error");
            tested.push({ ...server, enabled: false, toolHints: undefined });
          } finally { await client.close().catch(() => {}); }
        }
        await this.onInstall(tested);
        const connected = tested.filter(server => Array.isArray(server.toolHints)).length;
        new Notice(`Installed ${this.preview.manifest.name}.${this.servers.length ? ` MCP: ${connected}/${this.servers.length} connected.` : ""}`);
        if (connected === this.servers.length) { this.close(); return; }
        this.installed = true;
        closeButton?.setButtonText("Close");
        button.setButtonText("Close").setDisabled(false);
      } catch (error) { new Notice(error instanceof Error ? error.message : String(error)); button.setDisabled(false); }
    })(); }));
  }

  onClose(): void { this.contentEl.empty(); }
}
