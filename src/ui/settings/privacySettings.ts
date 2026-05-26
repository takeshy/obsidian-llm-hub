import { Setting } from "obsidian";
import { t } from "src/i18n";
import { DEFAULT_PRIVACY_SETTINGS } from "src/types";
import type { SettingsContext } from "./settingsContext";

export function displayPrivacySettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  const { plugin } = ctx;
  const privacy = plugin.settings.privacy ?? DEFAULT_PRIVACY_SETTINGS;

  new Setting(containerEl).setName(t("settings.privacy" as never)).setHeading();

  new Setting(containerEl)
    .setName(t("settings.privacyEnabled" as never))
    .setDesc(t("settings.privacyEnabled.desc" as never))
    .addToggle((toggle) =>
      toggle
        .setValue(privacy.enabled)
        .onChange((value) => {
          void (async () => {
            if (!plugin.settings.privacy) {
              plugin.settings.privacy = { ...DEFAULT_PRIVACY_SETTINGS };
            }
            plugin.settings.privacy.enabled = value;
            await plugin.saveSettings();
          })();
        })
    );

  new Setting(containerEl)
    .setName(t("settings.privateTag" as never))
    .setDesc(t("settings.privateTag.desc" as never))
    .addText((text) => {
      text
        .setPlaceholder(t("settings.privateTag.placeholder" as never))
        .setValue(privacy.privateTag);
      text.inputEl.addEventListener("blur", () => {
        void (async () => {
          if (!plugin.settings.privacy) {
            plugin.settings.privacy = { ...DEFAULT_PRIVACY_SETTINGS };
          }
          plugin.settings.privacy.privateTag = text.inputEl.value.trim() || DEFAULT_PRIVACY_SETTINGS.privateTag;
          await plugin.saveSettings();
        })();
      });
    });

  new Setting(containerEl)
    .setName(t("settings.privateFolders" as never))
    .setDesc(t("settings.privateFolders.desc" as never))
    .addText((text) => {
      text
        .setPlaceholder(t("settings.privateFolders.placeholder" as never))
        .setValue(privacy.privateFolders.join(", "));
      text.inputEl.addEventListener("blur", () => {
        void (async () => {
          if (!plugin.settings.privacy) {
            plugin.settings.privacy = { ...DEFAULT_PRIVACY_SETTINGS };
          }
          plugin.settings.privacy.privateFolders = text.inputEl.value
            .split(",")
            .map(s => s.trim())
            .filter(Boolean);
          await plugin.saveSettings();
        })();
      });
    });
}
