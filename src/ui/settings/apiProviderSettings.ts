import { Setting, Notice, Modal, App, Platform } from "obsidian";
import { t } from "src/i18n";
import type { ApiProviderConfig, ApiProviderType } from "src/types";
import { KNOWN_PROVIDER_DEFAULTS } from "src/types";
import { verifyApiProvider, verifyOpencodeGo } from "src/core/openaiProvider";
import { verifyAnthropicProvider } from "src/core/anthropicProvider";
import { verifyGeminiProvider } from "src/core/gemini";
import { getKnownModels, OPENCODE_GO_FALLBACK_MODELS } from "src/core/modelPricing";
import type { SettingsContext } from "./settingsContext";

export function displayApiProviderSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  if (Platform.isMobile) return;

  const { plugin, display } = ctx;
  const app = plugin.app;

  new Setting(containerEl).setName(t("settings.apiProviders")).setHeading();

  new Setting(containerEl)
    .setDesc(t("settings.apiProviders.desc"));

  // List existing providers
  for (const provider of plugin.settings.apiProviders) {
    const modelInfo = provider.enabledModels.length > 0 ? ` (${provider.enabledModels.join(", ")})` : "";
    const isKnown = !!KNOWN_PROVIDER_DEFAULTS[provider.type];
    const providerSetting = new Setting(containerEl)
      .setName(`${provider.name}${modelInfo}`)
      .setDesc(isKnown ? "" : provider.baseUrl);

    const statusEl = providerSetting.controlEl.createDiv({ cls: "llm-hub-cli-row-status" });
    if (provider.verified && provider.enabled) {
      statusEl.addClass("llm-hub-cli-status--success");
      statusEl.textContent = t("settings.cliVerified");
    } else if (!provider.enabled) {
      statusEl.textContent = t("settings.apiProviderDisabled");
    }

    // Toggle enable/disable
    providerSetting.addToggle((toggle) =>
      toggle
        .setValue(provider.enabled)
        .onChange(async (value) => {
          provider.enabled = value;
          await plugin.saveSettings();
          display();
        })
    );

    // Edit button
    providerSetting.addExtraButton((button) =>
      button
        .setIcon("settings")
        .setTooltip(t("settings.apiProviderEdit"))
        .onClick(() => {
          new ApiProviderModal(app, provider, async (updated) => {
            const idx = plugin.settings.apiProviders.findIndex(p => p.id === provider.id);
            if (idx >= 0) {
              plugin.settings.apiProviders[idx] = updated;
              await plugin.saveSettings();
              display();
            }
          }, plugin.settings.proxyUrl, plugin.settings.proxyBypass).open();
        })
    );

    // Delete button
    providerSetting.addExtraButton((button) =>
      button
        .setIcon("trash")
        .setTooltip(t("settings.apiProviderDelete"))
        .onClick(async () => {
          plugin.settings.apiProviders = plugin.settings.apiProviders.filter(p => p.id !== provider.id);
          await plugin.saveSettings();
          display();
        })
    );
  }

  // Add new provider button
  new Setting(containerEl)
    .addButton((btn) =>
      btn
        .setButtonText(t("settings.apiProviderAdd"))
        .setCta()
        .onClick(() => {
          const newProvider: ApiProviderConfig = {
            id: `provider_${Date.now()}`,
            name: "Gemini",
            type: "gemini",
            baseUrl: KNOWN_PROVIDER_DEFAULTS.gemini.baseUrl,
            apiKey: "",
            enabledModels: [],
            availableModels: [],
            verified: false,
            enabled: true,
          };
          new ApiProviderModal(app, newProvider, async (created) => {
            plugin.settings.apiProviders.push(created);
            await plugin.saveSettings();
            display();
          }, plugin.settings.proxyUrl, plugin.settings.proxyBypass).open();
        })
    );
}

class ApiProviderModal extends Modal {
  private config: ApiProviderConfig;
  private onSave: (config: ApiProviderConfig) => Promise<void>;
  private proxyUrl?: string;
  private proxyBypass?: string;

  constructor(app: App, config: ApiProviderConfig, onSave: (config: ApiProviderConfig) => Promise<void>, proxyUrl?: string, proxyBypass?: string) {
    super(app);
    this.config = { ...config };
    this.onSave = onSave;
    this.proxyUrl = proxyUrl;
    this.proxyBypass = proxyBypass;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: t("settings.apiProviderConfigure") });

    // Provider type
    new Setting(contentEl)
      .setName(t("settings.apiProviderType"))
      .addDropdown((dropdown) => {
        dropdown.addOption("gemini", "Gemini");
        dropdown.addOption("openai", "OpenAI");
        dropdown.addOption("anthropic", "Anthropic");
        dropdown.addOption("openrouter", "OpenRouter");
        dropdown.addOption("grok", "Grok");
        dropdown.addOption("opencodego", "OpenCode Go");
        dropdown.addOption("opencodezen", "OpenCode Zen");
        dropdown.addOption("custom", t("settings.apiProviderCustom"));
        dropdown.setValue(this.config.type);
        dropdown.onChange((value) => {
          this.config.type = value as ApiProviderType;
          const defaults = KNOWN_PROVIDER_DEFAULTS[value];
          if (defaults) {
            this.config.baseUrl = defaults.baseUrl;
            this.config.name = defaults.displayName;
          }
          this.onOpen(); // Re-render
        });
      });

    // Name (editable only for custom providers)
    const isKnownProvider = !!KNOWN_PROVIDER_DEFAULTS[this.config.type];
    if (isKnownProvider) {
      // Force name and baseUrl from defaults
      this.config.name = KNOWN_PROVIDER_DEFAULTS[this.config.type].displayName;
      this.config.baseUrl = KNOWN_PROVIDER_DEFAULTS[this.config.type].baseUrl;
    } else {
      // Name (editable only for custom/unknown providers)
      new Setting(contentEl)
        .setName(t("settings.apiProviderName"))
        .addText((text) =>
          text
            .setPlaceholder("My Provider")
            .setValue(this.config.name)
            .onChange((value) => { this.config.name = value.trim(); })
        );

      // Base URL (editable only for custom/unknown providers)
      new Setting(contentEl)
        .setName(t("settings.apiProviderBaseUrl"))
        .addText((text) =>
          text
            .setPlaceholder("https://api.openai.com")
            .setValue(this.config.baseUrl)
            .onChange((value) => { this.config.baseUrl = value.trim(); })
        );
    }

    // API Key
    new Setting(contentEl)
      .setName(t("settings.apiProviderApiKey"))
      .addText((text) => {
        text
          .setPlaceholder(t("settings.googleApiKey.placeholder"))
          .setValue(this.config.apiKey)
          .onChange((value) => { this.config.apiKey = value.trim(); });
        text.inputEl.type = "password";
      });

    // Model selection — checkboxes for enabling/disabling models
    const knownModels = getKnownModels(this.config.type);
    const fetchedModels = this.config.availableModels;
    // Merge: known models first, then any fetched models not in known list
    const modelChoices = knownModels.length > 0
      ? [...knownModels, ...fetchedModels.filter(m => !knownModels.includes(m))]
      : fetchedModels;

    if (modelChoices.length > 0) {
      const modelSetting = new Setting(contentEl)
        .setName(t("settings.apiProviderModel"))
        .setDesc(t("settings.apiProviderModel.desc"));

      // Search filter (show when many models)
      const items: HTMLElement[] = [];
      if (modelChoices.length > 20) {
        const filterInput = modelSetting.controlEl.createEl("input", {
          type: "text",
          placeholder: t("settings.apiProviderModelFilter"),
          cls: "llm-hub-model-filter",
        });
        filterInput.addEventListener("input", () => {
          const query = filterInput.value.toLowerCase();
          for (const item of items) {
            const name = item.textContent?.toLowerCase() ?? "";
            item.toggleClass("llm-hub-hidden", !name.includes(query));
          }
        });
      }

      const listEl = modelSetting.controlEl.createDiv({ cls: "llm-hub-model-checklist" });
      for (const m of modelChoices) {
        const label = listEl.createEl("label", { cls: "llm-hub-model-check-item" });
        const cb = label.createEl("input", { type: "checkbox" });
        cb.checked = this.config.enabledModels.includes(m);
        cb.addEventListener("change", () => {
          if (cb.checked) {
            if (!this.config.enabledModels.includes(m)) {
              this.config.enabledModels.push(m);
            }
          } else {
            this.config.enabledModels = this.config.enabledModels.filter(x => x !== m);
          }
        });
        label.createSpan({ text: m });
        items.push(label);
      }
    } else if (!this.config.verified) {
      // Not yet verified — show hint
      new Setting(contentEl)
        .setName(t("settings.apiProviderModel"))
        .setDesc(t("settings.apiProviderVerifyRequired"));
    }

    // Buttons: Verify + Save
    const buttonSetting = new Setting(contentEl);

    buttonSetting.addButton((btn) =>
      btn
        .setButtonText(t("settings.apiProviderVerify"))
        .onClick(async () => {
          btn.setDisabled(true);
          btn.setButtonText(t("settings.cliVerifying"));
          try {
            // OpenCode Go has no `/v1/models`, so it uses a dedicated
            // reachability probe on `/v1/chat/completions`. Any HTTP
            // response (even 401/404) means the URL is live; DNS /
            // connection errors fail verify so a typo'd baseUrl or missing
            // API key surface here instead of at chat time. See issue #37.
            let result: { success: boolean; error?: string; models?: string[] };
            if (this.config.type === "opencodego") {
              const probe = await verifyOpencodeGo(this.config.baseUrl, this.config.apiKey, this.proxyUrl, this.proxyBypass);
              result = probe.success
                ? { success: true, models: OPENCODE_GO_FALLBACK_MODELS }
                : { success: false, error: probe.error };
            } else if (this.config.type === "gemini") {
              result = await verifyGeminiProvider(this.config.apiKey, this.proxyUrl, this.proxyBypass);
            } else if (this.config.type === "anthropic") {
              result = await verifyAnthropicProvider(this.config.baseUrl, this.config.apiKey, this.proxyUrl, this.proxyBypass);
            } else {
              result = await verifyApiProvider(this.config.baseUrl, this.config.apiKey, this.proxyUrl, this.proxyBypass);
            }
            if (result.success) {
              this.config.verified = true;
              this.config.availableModels = result.models || [];
              new Notice(t("settings.apiProviderVerified", { count: String(this.config.availableModels.length) }));
              this.onOpen(); // Re-render with models
            } else {
              new Notice(t("settings.apiProviderVerifyFailed", { error: result.error || "Unknown error" }));
            }
          } catch (error) {
            new Notice(t("settings.apiProviderVerifyFailed", { error: error instanceof Error ? error.message : String(error) }));
          } finally {
            btn.setDisabled(false);
            btn.setButtonText(t("settings.apiProviderVerify"));
          }
        })
    );

    buttonSetting.addButton((btn) =>
      btn
        .setButtonText(t("common.save"))
        .setCta()
        .onClick(async () => {
          if (!this.config.name) {
            new Notice(t("settings.apiProviderNameRequired"));
            return;
          }
          if (!this.config.apiKey) {
            new Notice(t("settings.apiProviderApiKeyRequired"));
            return;
          }
          if (!this.config.verified) {
            new Notice(t("settings.apiProviderVerifyRequired"));
            return;
          }
          await this.onSave(this.config);
          this.close();
        })
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}
