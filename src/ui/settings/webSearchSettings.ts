import { resolveWebSearchMode } from "src/core/webSearchMode";
import { createWebSearchTransport } from "src/core/externalWebSearch";
import { addWebSearchUsageSetting } from "obsidian-llm-hub-common/settings";
import { Setting } from "obsidian";
import { t } from "src/i18n";
import type { SettingsContext } from "./settingsContext";

export function displayWebSearchSettings(containerEl: HTMLElement, { plugin }: SettingsContext): () => void {
  let disposeUsage: (() => void) | undefined;
  const selectedProvider = () => resolveWebSearchMode(plugin.settings.webSearch) === "external"
    ? plugin.settings.webSearch.provider : resolveWebSearchMode(plugin.settings.webSearch);
  new Setting(containerEl).setName(t("settings.webSearch")).setHeading();
  new Setting(containerEl).setName(t("settings.webSearch.provider"))
    .setDesc(t("settings.webSearch.desc"))
    .addDropdown(dropdown => {
      dropdown.addOption("native", t("settings.webSearch.native")).addOption("tavily", "Tavily").addOption("brave", "Brave Search")
        .setValue(selectedProvider())
        .onChange(value => {
          if (value === "native") {
            plugin.settings.webSearch.mode = value;
          } else if (value === "tavily" || value === "brave") {
            plugin.settings.webSearch.mode = "external";
            plugin.settings.webSearch.provider = value;
          } else return;
          renderProviderSettings();
          void plugin.saveSettings();
        });
    });
  const providerContainer = containerEl.createDiv();
  function renderProviderSettings(): void {
    disposeUsage?.();
    disposeUsage = undefined;
    providerContainer.empty();
    const provider = selectedProvider();
    if (provider !== "tavily" && provider !== "brave") return;
    const key = provider === "tavily" ? "tavilyApiKey" : "braveApiKey";
    const name = provider === "tavily" ? "Tavily" : "Brave Search";
    const setting = new Setting(providerContainer).setName(t("settings.webSearch.apiKey", { name }))
      .setDesc(t("settings.webSearch.apiKey.desc"));
    setting.addText(text => {
      text.setValue(plugin.settings.webSearch[key]).onChange(value => {
        plugin.settings.webSearch[key] = value.trim();
        usage.render();
        void plugin.saveSettings();
      });
      text.inputEl.type = "password";
    });
    setting.addExtraButton(button => button.setIcon("eye").setTooltip(t("settings.showOrHideApiKey"))
      .onClick(() => {
        const input = setting.controlEl.querySelector("input");
        if (input) {
          input.type = input.type === "password" ? "text" : "password";
          button.setIcon(input.type === "password" ? "eye" : "eye-off");
        }
      }));
    const usage = addWebSearchUsageSetting(providerContainer, {
      provider: key === "tavilyApiKey" ? "tavily" : "brave",
      getApiKey: () => plugin.settings.webSearch[key],
      transport: createWebSearchTransport(plugin.settings.proxyUrl, plugin.settings.proxyBypass),
    });
    disposeUsage = usage.dispose;
  }
  renderProviderSettings();
  return () => { disposeUsage?.(); };
}
