import { Setting } from "obsidian";
import { getOpenRouterApiKey } from "src/core/jevRagFilter";
import { credentialSlot } from "src/core/credentialBundle";
import { t } from "src/i18n";
import { markCredentialConfiguredElsewhere } from "./credentialStorageSettings";
import type { SettingsContext } from "./settingsContext";

export function displayJevSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  const { plugin, display } = ctx;
  const openRouterConfigured = getOpenRouterApiKey(plugin.settings.apiProviders).length > 0;
  const useOpenRouter = openRouterConfigured && plugin.settings.jevUseOpenRouter;

  new Setting(containerEl).setName(t("settings.jev")).setHeading();

  new Setting(containerEl)
    .setName(t("settings.jevRagFilter"))
    .setDesc(t("settings.jevRagFilter.desc"))
    .addToggle(toggle => toggle
      .setValue(plugin.settings.jevRagFilterEnabled)
      .onChange(async value => {
        plugin.settings.jevRagFilterEnabled = value;
        await plugin.saveSettings();
        display();
      }));

  if (!plugin.settings.jevRagFilterEnabled) return;

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
          .setPlaceholder("jv_live_…")
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
