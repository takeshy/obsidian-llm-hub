import { Setting, Platform, Notice } from "obsidian";
import { t } from "src/i18n";
import type { SettingsContext } from "./settingsContext";

function isValidProxyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function displayProxySettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  if (Platform.isMobile) return;

  const { plugin } = ctx;

  new Setting(containerEl).setName(t("settings.proxy")).setHeading();

  new Setting(containerEl)
    .setName(t("settings.proxyUrl"))
    .setDesc(t("settings.proxyUrl.desc"))
    .addText((text) =>
      text
        .setPlaceholder("http://proxy:8080")
        .setValue(plugin.settings.proxyUrl || "")
        .onChange(async (value) => {
          const trimmed = value.trim();
          if (trimmed && !isValidProxyUrl(trimmed)) {
            new Notice("Invalid proxy URL. Use http:// or https:// format.");
            return;
          }
          plugin.settings.proxyUrl = trimmed || undefined;
          await plugin.saveSettings();
        })
    );

  new Setting(containerEl)
    .setName(t("settings.proxyBypass"))
    .setDesc(t("settings.proxyBypass.desc"))
    .addText((text) =>
      text
        .setPlaceholder("api.openai.com, localhost")
        .setValue(plugin.settings.proxyBypass || "")
        .onChange(async (value) => {
          plugin.settings.proxyBypass = value.trim() || undefined;
          await plugin.saveSettings();
        })
    );
}
