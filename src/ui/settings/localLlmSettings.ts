import { Setting, Notice, Platform } from "obsidian";
import { t } from "src/i18n";
import { DEFAULT_LOCAL_LLM_CONFIG } from "src/types";
import type { LocalLlmConfig } from "src/types";
import { LocalLlmModal } from "./LocalLlmModal";
import type { SettingsContext } from "./settingsContext";

export function displayLocalLlmSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  if (Platform.isMobile) return;

  const { plugin, display } = ctx;
  const app = plugin.app;
  const configs = plugin.settings.localLlmConfigs ?? [];

  new Setting(containerEl).setName(t("settings.localLlm")).setHeading();
  new Setting(containerEl).setDesc(t("settings.localLlmDesc"));

  for (const config of configs) {
    const enabled = config.enabledModels && config.enabledModels.length > 0
      ? config.enabledModels
      : (config.model ? [config.model] : []);
    const baseLabel = config.name && config.name.trim()
      ? config.name.trim()
      : `Local LLM (${config.framework})`;
    const modelInfo = enabled.length > 0 ? ` (${enabled.join(", ")})` : "";
    const row = new Setting(containerEl)
      .setName(`${baseLabel}${modelInfo}`)
      .setDesc(config.baseUrl);

    const statusEl = row.controlEl.createDiv({ cls: "llm-hub-cli-row-status" });
    if (config.verified && config.enabled !== false) {
      statusEl.addClass("llm-hub-cli-status--success");
      statusEl.textContent = t("settings.cliVerified");
    } else if (config.enabled === false) {
      statusEl.textContent = t("settings.apiProviderDisabled");
    }

    row.addToggle((toggle) =>
      toggle
        .setValue(config.enabled !== false)
        .onChange(async (value) => {
          config.enabled = value;
          await plugin.saveSettings();
          display();
        })
    );

    row.addExtraButton((button) =>
      button
        .setIcon("settings")
        .setTooltip(t("settings.localLlmConfigure"))
        .onClick(() => {
          new LocalLlmModal(
            app,
            config,
            config.availableModels ?? [],
            async (updated, models) => {
              const idx = plugin.settings.localLlmConfigs.findIndex(c => c.id === config.id);
              if (idx >= 0) {
                const enabled = updated.enabledModels ?? [];
                const merged: LocalLlmConfig = {
                  ...updated,
                  availableModels: models,
                  verified: enabled.length > 0,
                };
                plugin.settings.localLlmConfigs[idx] = merged;
                await plugin.saveSettings();
                display();
                new Notice(t("settings.localLlmVerified"));
              }
            },
          ).open();
        })
    );

    row.addExtraButton((button) =>
      button
        .setIcon("trash")
        .setTooltip(t("settings.apiProviderDelete"))
        .onClick(async () => {
          plugin.settings.localLlmConfigs = plugin.settings.localLlmConfigs.filter(c => c.id !== config.id);
          await plugin.saveSettings();
          display();
        })
    );

    // Tools auto-disabled list — shown only when the chat path has flagged
    // a model as rejecting OpenAI tool-calls. Lets the user re-enable retries
    // (e.g. after upgrading the model server or switching to a tools-capable
    // build of the same model).
    const disabledModels = config.toolsUnsupportedModels ?? [];
    if (disabledModels.length > 0) {
      const subRow = new Setting(containerEl)
        .setName(t("settings.localLlmToolsDisabled"))
        .setDesc(disabledModels.join(", "));
      subRow.settingEl.addClass("llm-hub-sub-setting");
      subRow.addButton((btn) =>
        btn
          .setButtonText(t("settings.localLlmToolsClear"))
          .onClick(async () => {
            const idx = plugin.settings.localLlmConfigs.findIndex(c => c.id === config.id);
            if (idx >= 0) {
              const cfg = plugin.settings.localLlmConfigs[idx];
              plugin.settings.localLlmConfigs[idx] = {
                ...cfg,
                toolsUnsupportedModels: [],
              };
              await plugin.saveSettings();
              display();
            }
          })
      );
    }
  }

  new Setting(containerEl)
    .addButton((btn) =>
      btn
        .setButtonText(t("settings.localLlmAdd"))
        .setCta()
        .onClick(() => {
          const draft: LocalLlmConfig = {
            ...DEFAULT_LOCAL_LLM_CONFIG,
            id: `local_${Date.now()}`,
            enabled: true,
          };
          new LocalLlmModal(
            app,
            draft,
            [],
            async (created, models) => {
              const enabled = created.enabledModels ?? [];
              const final: LocalLlmConfig = {
                ...created,
                availableModels: models,
                verified: enabled.length > 0,
              };
              plugin.settings.localLlmConfigs.push(final);
              await plugin.saveSettings();
              display();
              new Notice(t("settings.localLlmVerified"));
            },
          ).open();
        })
    );
}
