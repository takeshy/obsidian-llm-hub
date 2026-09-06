import { Notice, Setting } from "obsidian";
import { clearMcpToolsCache } from "src/core/mcpTools";
import { agentPluginAbsolutePaths, installAgentPlugin, parseAgentPluginMcp, previewAgentPlugin, uninstallAgentPlugin } from "src/core/agentPlugins";
import type { AgentPluginInstall, McpServerConfig } from "src/types";
import type { SettingsContext } from "./settingsContext";
import { AgentPluginInstallModal } from "./AgentPluginInstallModal";

function mergeServer(next: McpServerConfig, previous?: McpServerConfig): McpServerConfig {
  if (!previous) return next;
  const same = next.transport === previous.transport && next.url === previous.url && next.command === previous.command && JSON.stringify(next.args ?? []) === JSON.stringify(previous.args ?? []) && JSON.stringify(next.env ?? {}) === JSON.stringify(previous.env ?? {});
  return same ? { ...next, enabled: previous.enabled, toolHints: previous.toolHints } : next;
}

export function displayAgentPluginSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  const { plugin, display } = ctx;
  new Setting(containerEl).setName("Agent plugins").setHeading();
  containerEl.createDiv({ cls: "setting-item-description", text: "Install portable Agent Plugins v1.0.0 from a public GitHub repository. Packages are pinned to a commit and stored in .llm-hub/agent-plugins." });
  let repository = "";
  new Setting(containerEl).setName("GitHub repository").setDesc("owner/repository or a GitHub URL")
    .addText(text => text.setPlaceholder("owner/repository").onChange(value => { repository = value; }))
    .addButton(button => button.setButtonText("Preview and install").setCta().onClick(() => { void (async () => {
      button.setDisabled(true); try {
        const preview = await previewAgentPlugin(repository);
        const prior = new Map(plugin.settings.mcpServers.filter(v => v.agentPlugin?.pluginName === preview.manifest.name).map(v => [v.agentPlugin!.serverName, v]));
        const paths = agentPluginAbsolutePaths(plugin.app, preview.manifest.name);
        let managed: McpServerConfig[] = [];
        const mcp = preview.files["mcp.json"];
        if (mcp) managed = parseAgentPluginMcp<McpServerConfig>(new TextDecoder().decode(mcp), preview.manifest.name, paths.root, paths.data).servers.map(v => mergeServer(v, prior.get(v.agentPlugin!.serverName)));
        let metadata: AgentPluginInstall | null = null;
        new AgentPluginInstallModal(plugin.app, preview, managed, async () => {
          metadata = await installAgentPlugin(plugin.app, preview);
        }, async testedServers => {
          if (!metadata) throw new Error("Agent Plugin installation did not complete.");
          const installed = metadata;
          plugin.settings.agentPlugins = [...(plugin.settings.agentPlugins ?? []).filter(v => v.name !== installed.name), installed];
          plugin.settings.mcpServers = [...plugin.settings.mcpServers.filter(v => v.agentPlugin?.pluginName !== installed.name), ...testedServers];
          await plugin.saveSettings(); clearMcpToolsCache(); plugin.settingsEmitter.emit("skills-changed"); display();
        }).open();
      } catch (error) { new Notice(error instanceof Error ? error.message : String(error)); } finally { button.setDisabled(false); }
    })(); }));

  for (const item of plugin.settings.agentPlugins ?? []) {
    const setting = new Setting(containerEl).setName(item.name).setDesc(`${item.version} · ${item.repo}@${item.commitSha.slice(0, 7)} · Skills: ${item.skillNames.join(", ") || "none"}`);
    setting.addToggle(toggle => toggle.setValue(item.enabled).setTooltip(item.enabled ? "Disable" : "Enable").onChange(value => { void (async () => {
      item.enabled = value;
      await plugin.app.vault.adapter.write(`.llm-hub/agent-plugins/${item.name}/install.json`, JSON.stringify(item, null, 2));
      for (const server of plugin.settings.mcpServers) if (server.agentPlugin?.pluginName === item.name && !value) server.enabled = false;
      await plugin.saveSettings(); clearMcpToolsCache(); plugin.settingsEmitter.emit("skills-changed"); display();
    })(); }));
    setting.addExtraButton(button => button.setIcon("refresh-cw").setTooltip("Check for update").onClick(() => { repository = item.repo; void (async () => {
      try { const next = await previewAgentPlugin(item.repo); if (next.commitSha === item.commitSha) new Notice(`${item.name} is up to date.`); else new Notice(`Update available for ${item.name}: ${next.version}. Use Preview and install above to review it.`); } catch (error) { new Notice(String(error)); }
    })(); }));
    setting.addExtraButton(button => button.setIcon("trash").setTooltip("Uninstall").onClick(() => { void (async () => {
      if (!window.confirm(`Uninstall ${item.name}?`)) return; await uninstallAgentPlugin(plugin.app, item.name); plugin.settings.agentPlugins = plugin.settings.agentPlugins.filter((v: AgentPluginInstall) => v.name !== item.name); plugin.settings.mcpServers = plugin.settings.mcpServers.filter(v => v.agentPlugin?.pluginName !== item.name); await plugin.saveSettings(); clearMcpToolsCache(); plugin.settingsEmitter.emit("skills-changed"); new Notice(`Uninstalled ${item.name}. Plugin data was preserved.`); display();
    })(); }));
  }
}
