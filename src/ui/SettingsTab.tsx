import { PluginSettingTab, App } from "obsidian";
import type { LlmHubPlugin } from "src/plugin";
import type { SettingsContext } from "src/ui/settings/settingsContext";

import { displayCredentialStorageSettings } from "src/ui/settings/credentialStorageSettings";
import { displayCliSettings } from "src/ui/settings/cliSettings";
import { displayLocalLlmSettings } from "src/ui/settings/localLlmSettings";
import { displayWorkspaceSettings } from "src/ui/settings/workspaceSettings";
import { displayKnowledgeSettings } from "src/ui/settings/knowledgeSettings";
import { displayEditHistorySettings } from "src/ui/settings/editHistorySettings";
import { displayEncryptionSettings } from "src/ui/settings/encryptionSettings";
import { displayLangfuseSettings } from "src/ui/settings/langfuseSettings";
import { displaySlashCommandSettings } from "src/ui/settings/slashCommandSettings";
import { displayExternalSkillSettings } from "src/ui/settings/externalSkillSettings";
import { displaySkillsSettings } from "src/ui/settings/skillsSettings";
import { displayRagSettings } from "src/ui/settings/ragSettings";
import { displayMcpServersSettings } from "src/ui/settings/mcpServersSettings";
import { displayApiProviderSettings } from "src/ui/settings/apiProviderSettings";
import { displayProxySettings } from "src/ui/settings/proxySettings";
import { displayDiscordSettings } from "src/ui/settings/discordSettings";
import { displayAgentPluginSettings } from "src/ui/settings/agentPluginSettings";

export class SettingsTab extends PluginSettingTab {
  plugin: LlmHubPlugin;
  private syncCancelRef = { value: false };
  private settingsListener: ((s: unknown) => void) | null = null;

  constructor(app: App, plugin: LlmHubPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /** Render settings using the API available at the declared minimum version. */
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const ctx: SettingsContext = {
      plugin: this.plugin,
      display: () => this.display(),
      syncCancelRef: this.syncCancelRef,
    };

    displayCredentialStorageSettings(containerEl, ctx);
    displayCliSettings(containerEl, ctx);
    displayLocalLlmSettings(containerEl, ctx);
    displayApiProviderSettings(containerEl, ctx);
    displayProxySettings(containerEl, ctx);
    displayWorkspaceSettings(containerEl, ctx);
    displayKnowledgeSettings(containerEl, ctx);
    displayEditHistorySettings(containerEl, ctx);
    displayEncryptionSettings(containerEl, ctx);
    displayLangfuseSettings(containerEl, ctx);
    displaySlashCommandSettings(containerEl, ctx);
    displaySkillsSettings(containerEl, ctx);
    displayExternalSkillSettings(containerEl, ctx);
    displayAgentPluginSettings(containerEl, ctx);
    displayRagSettings(containerEl, ctx);
    displayMcpServersSettings(containerEl, ctx);
    displayDiscordSettings(containerEl, ctx);

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
