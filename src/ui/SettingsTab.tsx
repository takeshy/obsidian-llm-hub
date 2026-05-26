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
import { displayPrivacySettings } from "src/ui/settings/privacySettings";

export class SettingsTab extends PluginSettingTab {
  plugin: LlmHubPlugin;
  private syncCancelRef = { value: false };
  private settingsListener: ((s: unknown) => void) | null = null;

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
    displayPrivacySettings(containerEl, ctx);
    displayEditHistorySettings(containerEl, ctx);
    displayEncryptionSettings(containerEl, ctx);
    displayLangfuseSettings(containerEl, ctx);
    displaySlashCommandSettings(containerEl, ctx);
    displayRagSettings(containerEl, ctx);
    displayMcpServersSettings(containerEl, ctx);
    displayDiscordSettings(containerEl, ctx);

    // Refresh the tab when settings change elsewhere (e.g. chat-side
    // auto-disable of tools for a Local LLM model). Without this, the
    // user could open the tab, edit a config, and unknowingly clobber
    // the chat-side update on save. Re-register on every display() so
    // we use the freshest closure; deregister the previous listener
    // first to avoid leaks when display() is called repeatedly.
    if (this.settingsListener) {
      this.plugin.settingsEmitter.off("settings-updated", this.settingsListener);
    }
    this.settingsListener = () => this.display();
    this.plugin.settingsEmitter.on("settings-updated", this.settingsListener);
  }

  hide(): void {
    if (this.settingsListener) {
      this.plugin.settingsEmitter.off("settings-updated", this.settingsListener);
      this.settingsListener = null;
    }
  }
}
