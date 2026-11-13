import { Setting } from "obsidian";
import { getOpenRouterApiKey } from "src/core/jevRagFilter";
import { getRagDecisionModel, getRagDecisionModels } from "src/core/ragDecision";
import { credentialSlot } from "src/core/credentialBundle";
import { t } from "src/i18n";
import { markCredentialConfiguredElsewhere } from "./credentialStorageSettings";
import type { SettingsContext } from "./settingsContext";

export function displayJevSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  const { plugin, display } = ctx;
  const openRouterConfigured = getOpenRouterApiKey(plugin.settings.apiProviders).length > 0;
  const useOpenRouter = openRouterConfigured && plugin.settings.jevUseOpenRouter;

  new Setting(containerEl).setName(t("settings.ragDecision")).setHeading();

  const models = getRagDecisionModels(plugin.settings);
  const selected = getRagDecisionModel(plugin.settings);
  new Setting(containerEl)
    .setName(t("settings.ragDecisionModel"))
    .setDesc(t("settings.ragDecisionModel.desc"))
    .addDropdown(dropdown => {
      if (!models.some(model => model.value === selected)) {
        dropdown.addOption(selected, t("settings.ragDecisionModel.unavailable"));
        dropdown.selectEl.options[0].disabled = true;
      }
      for (const model of models) dropdown.addOption(model.value, model.label);
      dropdown.setValue(selected).setDisabled(models.length === 0).onChange(async value => {
        plugin.settings.ragDecisionModel = value;
        await plugin.saveSettings();
        display();
      });
    });

  if (openRouterConfigured) {
    const openRouterSetting = new Setting(containerEl)
      .setName(t("settings.jevUseOpenRouter"))
      .setDesc(t("settings.jevUseOpenRouter.desc"))
      .addToggle(toggle => toggle
        .setValue(useOpenRouter)
        .onChange(async value => {
          plugin.settings.jevUseOpenRouter = value;
          await plugin.saveSettings();
          display();
        }));
    openRouterSetting.settingEl.addClass("llm-hub-jev-child-setting");
  }

  if (!useOpenRouter) {
    const keySetting = new Setting(containerEl)
      .setName(t("settings.jevApiKey"))
      .setDesc(t("settings.jevApiKey.desc"))
      .addText(text => {
        text
          .setPlaceholder(t("settings.jevApiKey"))
          .setValue(plugin.settings.jevApiKey)
          .onChange(async value => {
            plugin.settings.jevApiKey = value.trim();
            await plugin.saveSettings();
          });
        text.inputEl.type = "password";
      });
    keySetting.settingEl.addClass("llm-hub-jev-child-setting");
    markCredentialConfiguredElsewhere(keySetting, plugin, credentialSlot.jev, plugin.settings.jevApiKey);
  }
}
