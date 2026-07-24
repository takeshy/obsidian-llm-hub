import { PluginSettingTab, App, type SettingDefinitionItem } from "obsidian";
import { t } from "src/i18n";
import type { LlmHubPlugin } from "src/plugin";
import type { SettingsContext } from "src/ui/settings/settingsContext";

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

export class SettingsTab extends PluginSettingTab {
  plugin: LlmHubPlugin;
  private syncCancelRef = { value: false };
  private settingsListener: ((s: unknown) => void) | null = null;

  constructor(app: App, plugin: LlmHubPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const ctx: SettingsContext = {
      plugin: this.plugin,
      display: () => this.update(),
      syncCancelRef: this.syncCancelRef,
    };

    // Refresh definitions when settings change elsewhere (for example when
    // Chat automatically disables tools for a Local LLM model).
    if (this.settingsListener) {
      this.plugin.settingsEmitter.off("settings-updated", this.settingsListener);
    }
    this.settingsListener = () => this.update();
    this.plugin.settingsEmitter.on("settings-updated", this.settingsListener);

    const sections: Array<{
      name: string;
      render: (containerEl: HTMLElement, context: SettingsContext) => void;
    }> = [
      { name: t("settings.cliProviders"), render: displayCliSettings },
      { name: t("settings.localLlm"), render: displayLocalLlmSettings },
      { name: t("settings.apiProviders"), render: displayApiProviderSettings },
      { name: t("settings.proxy"), render: displayProxySettings },
      { name: t("settings.workspace"), render: displayWorkspaceSettings },
      { name: t("settings.knowledge"), render: displayKnowledgeSettings },
      { name: t("settings.encryption"), render: displayEncryptionSettings },
      { name: t("settings.langfuse"), render: displayLangfuseSettings },
      { name: t("settings.slashCommands"), render: displaySlashCommandSettings },
      { name: t("settings.skills"), render: displaySkillsSettings },
      { name: t("settings.externalSkills"), render: displayExternalSkillSettings },
      { name: t("settings.rag"), render: displayRagSettings },
      { name: t("settings.mcpServers"), render: displayMcpServersSettings },
      { name: t("settings.discord"), render: displayDiscordSettings },
    ];

    // This section has no UI, but still normalizes legacy edit-history data.
    displayEditHistorySettings(this.containerEl, ctx);

    return sections.map((section) => ({
      name: section.name,
      render: (setting) => {
        const containerEl = setting.settingEl;
        containerEl.empty();
        containerEl.removeClass("setting-item");
        section.render(containerEl, ctx);
      },
    }));
  }

  hide(): void {
    if (this.settingsListener) {
      this.plugin.settingsEmitter.off("settings-updated", this.settingsListener);
      this.settingsListener = null;
    }
  }
}
