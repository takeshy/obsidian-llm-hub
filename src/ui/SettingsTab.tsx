import { PluginSettingTab, App } from "obsidian";
import type { LlmHubPlugin } from "src/plugin";
import type { SettingsContext } from "src/ui/settings/settingsContext";

import { displayCliSettings } from "src/ui/settings/cliSettings";
import { displayLocalLlmSettings } from "src/ui/settings/localLlmSettings";
import { displayWorkspaceSettings } from "src/ui/settings/workspaceSettings";
import { displayEditHistorySettings } from "src/ui/settings/editHistorySettings";
import { displayEncryptionSettings } from "src/ui/settings/encryptionSettings";
import { displayLangfuseSettings } from "src/ui/settings/langfuseSettings";
import { displaySlashCommandSettings } from "src/ui/settings/slashCommandSettings";
import { displayRagSettings } from "src/ui/settings/ragSettings";
import { displayMcpServersSettings } from "src/ui/settings/mcpServersSettings";
import { displayApiProviderSettings } from "src/ui/settings/apiProviderSettings";
import { displayProxySettings } from "src/ui/settings/proxySettings";
import { displayDiscordSettings } from "src/ui/settings/discordSettings";

export class SettingsTab extends PluginSettingTab {
  plugin: LlmHubPlugin;
  private syncCancelRef = { value: false };

  constructor(app: App, plugin: LlmHubPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const ctx: SettingsContext = {
      plugin: this.plugin,
      display: () => this.display(),
      syncCancelRef: this.syncCancelRef,
    };

    displayCliSettings(containerEl, ctx);
    displayLocalLlmSettings(containerEl, ctx);
    displayApiProviderSettings(containerEl, ctx);
    displayProxySettings(containerEl, ctx);
    displayWorkspaceSettings(containerEl, ctx);
    displayEditHistorySettings(containerEl, ctx);
    displayEncryptionSettings(containerEl, ctx);
    displayLangfuseSettings(containerEl, ctx);
    displaySlashCommandSettings(containerEl, ctx);
    displayRagSettings(containerEl, ctx);
    displayMcpServersSettings(containerEl, ctx);
    displayDiscordSettings(containerEl, ctx);
  }
}
