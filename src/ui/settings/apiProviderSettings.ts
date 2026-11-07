import { Setting, Notice, Modal, Platform, ExtraButtonComponent } from "obsidian";
import { t } from "src/i18n";
import type { ApiProviderConfig, ApiProviderType } from "src/types";
import { KNOWN_PROVIDER_DEFAULTS } from "src/types";
import { verifyApiProvider, verifyOpencodeGo } from "src/core/openaiProvider";
import { verifyAnthropicProvider } from "src/core/anthropicProvider";
import { verifyGeminiProvider } from "src/core/gemini";
import { addManualApiProviderModel, getApiProviderModelChoices, refreshApiProviderModels } from "./apiProviderModels";
import { credentialSlot } from "src/core/credentialBundle";
import { markCredentialConfiguredElsewhere } from "./credentialStorageSettings";
import type { LlmHubPlugin } from "src/plugin";
import type { SettingsContext } from "./settingsContext";

export function displayApiProviderSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  if (Platform.isMobile) return;

  const { plugin, display } = ctx;

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
          new ApiProviderModal(plugin, provider, async (updated) => {
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
          new ApiProviderModal(plugin, newProvider, async (created) => {
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
  private plugin: LlmHubPlugin;
  private proxyUrl?: string;
  private proxyBypass?: string;

  constructor(plugin: LlmHubPlugin, config: ApiProviderConfig, onSave: (config: ApiProviderConfig) => Promise<void>, proxyUrl?: string, proxyBypass?: string) {
    super(plugin.app);
    this.plugin = plugin;
    this.config = {
      ...config,
      enabledModels: [...config.enabledModels],
      availableModels: [...config.availableModels],
      manualModels: [...(config.manualModels ?? [])],
    };
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
          // The previous provider's catalog and verification do not apply here.
          this.config.availableModels = [];
          this.config.enabledModels = [];
          this.config.manualModels = [];
          this.config.verified = false;
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
            .setPlaceholder("My provider")
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
    const apiKeySetting = new Setting(contentEl)
      .setName(t("settings.apiProviderApiKey"))
      .addText((text) => {
        text
          .setPlaceholder(t("settings.googleApiKey.placeholder"))
          .setValue(this.config.apiKey)
          .onChange((value) => { this.config.apiKey = value.trim(); });
        text.inputEl.type = "password";
      });
    markCredentialConfiguredElsewhere(
      apiKeySetting,
      this.plugin,
      credentialSlot.apiProvider(this.config.id),
      this.config.apiKey,
    );

    new Setting(contentEl)
      .setName(t("settings.pdfInputMode"))
      .setDesc(t("settings.pdfInputMode.desc"))
      .addDropdown((dropdown) => dropdown
        .addOption("auto", t("settings.pdfInputMode.auto"))
        .addOption("native", t("settings.pdfInputMode.native"))
        .addOption("extract-text", t("settings.pdfInputMode.extractText"))
        .setValue(this.config.pdfInputMode ?? "auto")
        .onChange((value) => { this.config.pdfInputMode = value as import("src/types").PdfInputMode; }));

    // Model selection — checkboxes for enabling/disabling models
    const modelChoices = getApiProviderModelChoices(this.config);

    if (modelChoices.length > 0) {
      const modelSetting = new Setting(contentEl)
        .setName(t("settings.apiProviderModel"))
        .setDesc(t("settings.apiProviderModel.desc"));
      modelSetting.settingEl.addClass("llm-hub-model-setting");

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
        const row = listEl.createDiv({ cls: "llm-hub-model-check-row" });
        const item = row.createDiv({ cls: "llm-hub-model-check-item" });
        const cb = item.createEl("input", { type: "checkbox", attr: { "aria-label": m } });
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
        item.createSpan({ text: m });
        if (this.config.manualModels?.includes(m)) {
          new ExtraButtonComponent(row)
            .setIcon("trash")
            .setTooltip(t("settings.apiProviderManualModelRemove"))
            .onClick(() => {
              this.config.manualModels = this.config.manualModels?.filter(model => model !== m);
              this.config.enabledModels = this.config.enabledModels.filter(model => model !== m);
              this.onOpen();
            });
        }
        items.push(row);
      }
    }
    if (!this.config.verified) {
      // Not yet verified — show hint
      new Setting(contentEl)
        .setName(t("settings.apiProviderModel"))
        .setDesc(t("settings.apiProviderVerifyRequired"));
    }

    let manualModelName = "";
    const addManualModel = () => {
      if (addManualApiProviderModel(this.config, manualModelName)) {
        this.onOpen();
      }
    };
    new Setting(contentEl)
      .setName(t("settings.apiProviderManualModel"))
      .setDesc(t("settings.apiProviderManualModel.desc"))
      .addText((text) => {
        text.setPlaceholder(this.config.type === "openrouter" ? "vendor/model:nitro" : "model")
          .onChange(value => { manualModelName = value; });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && !event.isComposing) {
            event.preventDefault();
            event.stopPropagation();
            addManualModel();
          }
        });
      })
      .addButton(btn => btn
        .setButtonText(t("settings.apiProviderManualModelAdd"))
        .onClick(addManualModel));

    // Buttons: Verify + Save
    const buttonSetting = new Setting(contentEl);

    buttonSetting.addButton((btn) =>
      btn
        .setButtonText(t("settings.apiProviderVerify"))
        .onClick(async () => {
          btn.setDisabled(true);
          btn.setButtonText(t("settings.cliVerifying"));
          try {
            let result: { success: boolean; error?: string; models?: string[] };
            if (this.config.type === "opencodego") {
              result = await verifyOpencodeGo(this.config.baseUrl, this.config.apiKey, this.proxyUrl, this.proxyBypass);
            } else if (this.config.type === "gemini") {
              result = await verifyGeminiProvider(this.config.apiKey, this.proxyUrl, this.proxyBypass);
            } else if (this.config.type === "anthropic") {
              result = await verifyAnthropicProvider(this.config.baseUrl, this.config.apiKey, this.proxyUrl, this.proxyBypass);
            } else {
              result = await verifyApiProvider(this.config.baseUrl, this.config.apiKey, this.proxyUrl, this.proxyBypass);
            }
            if (result.success) {
              this.config.verified = true;
              refreshApiProviderModels(this.config, result.models);
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
