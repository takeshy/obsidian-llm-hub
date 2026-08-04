import { Setting, Notice } from "obsidian";
import { clearMcpToolsCache } from "src/core/mcpTools";
import { t } from "src/i18n";
import { McpServerModal } from "./McpServerModal";
import type { SettingsContext } from "./settingsContext";
import type { McpServerConfig } from "src/types";

/**
 * Get a description string for an MCP server
 */
function getServerDescription(server: McpServerConfig): string {
  let desc: string;
  if (server.transport === "stdio") {
    desc = `stdio: ${server.command || ""} ${(server.args || []).join(" ")}`.trim();
  } else {
    desc = server.url;
  }
  if (server.toolHints && server.toolHints.length > 0) {
    desc += `\n${t("settings.mcpToolHints", { tools: server.toolHints.join(", ") })}`;
  }
  return desc;
}

/**
 * Check if two server configs match (for finding servers in the list)
 */
function isSameServer(a: McpServerConfig, b: McpServerConfig): boolean {
  if (a.name !== b.name) return false;
  if ((a.transport || "http") !== (b.transport || "http")) return false;
  if (a.transport === "stdio") {
    return a.command === b.command;
  }
  return a.url === b.url;
}

export function displayMcpServersSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  const { plugin, display } = ctx;

  new Setting(containerEl).setName(t("settings.mcpServers")).setHeading();

  // Introduction
  const introEl = containerEl.createDiv({ cls: "setting-item-description llm-hub-mcp-intro" });
  introEl.textContent = t("settings.mcpServersIntro");

  // Add new server button
  new Setting(containerEl)
    .setName(t("settings.mcpServers.desc"))
    .addButton((btn) =>
      btn
        .setButtonText(t("settings.addMcpServer"))
        .setCta()
        .onClick(() => {
          new McpServerModal(
            plugin,
            null,
            async (server) => {
              plugin.settings.mcpServers.push(server);
              await plugin.saveSettings();
              clearMcpToolsCache();
              display();
              new Notice(t("settings.mcpServerCreated", { name: server.name }));
            }
          ).open();
        })
    );

  // List existing servers
  const servers = plugin.settings.mcpServers;
  if (servers.length === 0) {
    const emptyEl = containerEl.createDiv({ cls: "setting-item-description llm-hub-mcp-empty" });
    emptyEl.textContent = t("settings.mcpNoServers");
  } else {
    for (const server of servers) {
      const desc = getServerDescription(server);

      const serverSetting = new Setting(containerEl)
        .setName(server.name)
        .setDesc(desc);

      // Edit button
      serverSetting.addExtraButton((btn) => {
        btn
          .setIcon("pencil")
          .setTooltip(t("common.edit"))
          .onClick(() => {
            new McpServerModal(
              plugin,
              server,
              async (updated) => {
                const index = plugin.settings.mcpServers.findIndex(
                  (s) => isSameServer(s, server)
                );
                if (index >= 0) {
                  plugin.settings.mcpServers[index] = updated;
                  await plugin.saveSettings();
                  clearMcpToolsCache();
                  display();
                  new Notice(t("settings.mcpServerUpdated", { name: updated.name }));
                }
              }
            ).open();
          });
      });

      // Delete button
      serverSetting.addExtraButton((btn) => {
        btn
          .setIcon("trash")
          .setTooltip(t("common.delete"))
          .onClick(() => {
            void (async () => {
              plugin.settings.mcpServers = plugin.settings.mcpServers.filter(
                (s) => !isSameServer(s, server)
              );
              await plugin.saveSettings();
              clearMcpToolsCache();
              display();
              new Notice(t("settings.mcpServerDeleted", { name: server.name }));
            })();
          });
      });
    }
  }
}
