import { Modal, App, Setting, Notice } from "obsidian";
import { fetchLocalLlmModels } from "src/core/localLlmProvider";
import { t } from "src/i18n";
import type { LocalLlmConfig, LlmFramework } from "src/types";

export class LocalLlmModal extends Modal {
  private config: LocalLlmConfig;
  private onSave: (config: LocalLlmConfig, models: string[]) => void | Promise<void>;
  private fetchedModels: string[] = [];
  private modelsFetched = false;
  private saveButton: HTMLButtonElement | null = null;

  constructor(
    app: App,
    currentConfig: LocalLlmConfig,
    existingModels: string[],
    onSave: (config: LocalLlmConfig, models: string[]) => void | Promise<void>,
  ) {
    super(app);
    this.config = { ...currentConfig };
    this.onSave = onSave;
    if (existingModels.length > 0) {
      this.fetchedModels = [...existingModels];
      this.modelsFetched = true;
    }
  }

  onOpen() {
    this.display();
  }

  private display() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("llm-hub-modal");
    contentEl.createEl("h2", { text: t("settings.localLlmModal.title") });

    const descEl = contentEl.createDiv({ cls: "llm-hub-modal-desc" });
    descEl.textContent = t("settings.localLlmModal.desc");

    // Framework
    const frameworkDefaults: Record<LlmFramework, string> = {
      ollama: "http://localhost:11434",
      "lm-studio": "http://localhost:1234",
      anythingllm: "http://localhost:3001/api",
      vllm: "http://localhost:8000",
      opencode: "http://localhost:4096",
    };

    new Setting(contentEl)
      .setName(t("settings.localLlmModal.framework"))
      .setDesc(t("settings.localLlmModal.frameworkDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("ollama", "Ollama")
          .addOption("lm-studio", "LM Studio (OpenAI compatible)")
          .addOption("anythingllm", "AnythingLLM")
          .addOption("vllm", "vLLM")
          .addOption("opencode", "OpenCode (Local)")
          .setValue(this.config.framework)
          .onChange((value) => {
            const fw = value as LlmFramework;
            this.config.framework = fw;
            this.config.baseUrl = frameworkDefaults[fw];
            this.modelsFetched = false;
            this.fetchedModels = [];
            this.display();
          });
      });

    // Base URL
    new Setting(contentEl)
      .setName(t("settings.localLlmModal.baseUrl"))
      .setDesc(t("settings.localLlmModal.baseUrlDesc"))
      .addText((text) => {
        text
          .setPlaceholder(frameworkDefaults[this.config.framework])
          .setValue(this.config.baseUrl)
          .onChange((value) => {
            this.config.baseUrl = value;
            this.modelsFetched = false;
            this.fetchedModels = [];
            this.updateSaveButton();
          });
        text.inputEl.addClass("llm-hub-wide-input");
      });

    // API Key (optional)
    new Setting(contentEl)
      .setName(t("settings.localLlmModal.apiKey"))
      .setDesc(this.config.framework === "anythingllm"
        ? t("settings.localLlmModal.apiKeyDescAnythingllm")
        : t("settings.localLlmModal.apiKeyDesc"))
      .addText((text) => {
        text
          .setPlaceholder(t("settings.localLlmModal.apiKeyPlaceholder"))
          .setValue(this.config.apiKey || "")
          .onChange((value) => {
            this.config.apiKey = value || undefined;
          });
        text.inputEl.type = "password";
      });

    // Basic Auth (OpenCode local server may set OPENCODE_SERVER_USERNAME / PASSWORD)
    if (this.config.framework === "opencode") {
      new Setting(contentEl)
        .setName(t("settings.localLlmModal.username"))
        .setDesc(t("settings.localLlmModal.usernameDesc"))
        .addText((text) => {
          text
            .setPlaceholder(t("settings.localLlmModal.usernamePlaceholder"))
            .setValue(this.config.username || "")
            .onChange((value) => {
              this.config.username = value || undefined;
            });
        });

      new Setting(contentEl)
        .setName(t("settings.localLlmModal.password"))
        .setDesc(t("settings.localLlmModal.passwordDesc"))
        .addText((text) => {
          text
            .setPlaceholder(t("settings.localLlmModal.passwordPlaceholder"))
            .setValue(this.config.password || "")
            .onChange((value) => {
              this.config.password = value || undefined;
            });
          text.inputEl.type = "password";
        });
    }

    // Fetch models + multi-select checklist (mirrors API Provider settings)
    const fetchSetting = new Setting(contentEl)
      .setName(t("settings.localLlmModal.model"))
      .setDesc(t("settings.localLlmModal.modelDesc"));

    const fetchStatusEl = fetchSetting.controlEl.createDiv({ cls: "llm-hub-cli-row-status" });
    if (this.modelsFetched) {
      fetchStatusEl.addClass("llm-hub-cli-status--success");
      fetchStatusEl.textContent = t("settings.localLlmModal.modelsLoaded").replace("{{count}}", String(this.fetchedModels.length));
    }

    fetchSetting.addButton((btn) =>
      btn
        .setButtonText(t("settings.localLlmModal.fetchModels"))
        .onClick(async () => {
          fetchStatusEl.empty();
          fetchStatusEl.removeClass("llm-hub-cli-status--success", "llm-hub-cli-status--error");
          btn.setButtonText(t("settings.localLlmModal.fetching"));
          btn.setDisabled(true);
          try {
            const models = await fetchLocalLlmModels(this.config);
            if (models.length === 0) {
              fetchStatusEl.addClass("llm-hub-cli-status--error");
              fetchStatusEl.textContent = t("settings.localLlmModal.noModelsFound");
              return;
            }
            this.fetchedModels = models;
            this.modelsFetched = true;
            // Pre-select sensibly: if the user already chose models, keep the
            // ones that still exist. Otherwise fall back to the legacy single
            // `model` field, or the first fetched model when even that is empty.
            const previouslyEnabled = this.config.enabledModels ?? [];
            const stillValid = previouslyEnabled.filter(m => models.includes(m));
            if (stillValid.length > 0) {
              this.config.enabledModels = stillValid;
            } else if (this.config.model && models.includes(this.config.model)) {
              this.config.enabledModels = [this.config.model];
            } else {
              this.config.enabledModels = [models[0]];
            }
            // Keep config.model in sync with the first enabled model so legacy
            // code paths that still read it work without surprise.
            this.config.model = this.config.enabledModels[0];
            this.updateSaveButton();
            this.display();
          } catch (err) {
            fetchStatusEl.addClass("llm-hub-cli-status--error");
            fetchStatusEl.textContent = err instanceof Error ? err.message : String(err);
          } finally {
            btn.setButtonText(t("settings.localLlmModal.fetchModels"));
            btn.setDisabled(false);
          }
        })
    );

    // Multi-select checklist (only shown after fetch)
    if (this.modelsFetched && this.fetchedModels.length > 0) {
      const modelSetting = new Setting(contentEl).setDesc(t("settings.localLlmModal.modelMultiDesc"));

      const items: HTMLElement[] = [];
      if (this.fetchedModels.length > 20) {
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
      for (const m of this.fetchedModels) {
        const label = listEl.createEl("label", { cls: "llm-hub-model-check-item" });
        const cb = label.createEl("input", { type: "checkbox" });
        cb.checked = (this.config.enabledModels ?? []).includes(m);
        cb.addEventListener("change", () => {
          const current = this.config.enabledModels ?? [];
          if (cb.checked) {
            if (!current.includes(m)) {
              this.config.enabledModels = [...current, m];
            }
          } else {
            this.config.enabledModels = current.filter(x => x !== m);
          }
          // Keep `model` aligned with the first enabled selection.
          this.config.model = (this.config.enabledModels ?? [])[0] ?? "";
          this.updateSaveButton();
        });
        label.createSpan({ text: m });
        items.push(label);
      }
    }

    // Temperature
    new Setting(contentEl)
      .setName(t("settings.localLlmModal.temperature"))
      .setDesc(t("settings.localLlmModal.temperatureDesc"))
      .addText((text) => {
        text
          .setPlaceholder(t("settings.localLlmModal.serverDefault"))
          .setValue(this.config.temperature != null ? String(this.config.temperature) : "")
          .onChange((value) => {
            const trimmed = value.trim();
            this.config.temperature = trimmed ? parseFloat(trimmed) : undefined;
          });
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.max = "2";
        text.inputEl.step = "0.1";
      });

    // Max tokens
    new Setting(contentEl)
      .setName(t("settings.localLlmModal.maxTokens"))
      .setDesc(t("settings.localLlmModal.maxTokensDesc"))
      .addText((text) => {
        text
          .setPlaceholder(t("settings.localLlmModal.serverDefault"))
          .setValue(this.config.maxTokens != null ? String(this.config.maxTokens) : "")
          .onChange((value) => {
            const trimmed = value.trim();
            this.config.maxTokens = trimmed ? parseInt(trimmed, 10) : undefined;
          });
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.step = "1";
      });

    // Save / Cancel
    new Setting(contentEl)
      .addButton((btn) =>
        btn.setButtonText(t("common.cancel")).onClick(() => {
          this.close();
        })
      )
      .addButton((btn) => {
        this.saveButton = btn.buttonEl;
        btn
          .setButtonText(t("common.save"))
          .setCta()
          .onClick(() => {
            if (!this.config.baseUrl.trim()) {
              new Notice(t("settings.localLlmModal.baseUrlRequired"));
              return;
            }
            if (!this.modelsFetched) {
              new Notice(t("settings.localLlmModal.fetchRequired"));
              return;
            }
            if (!this.config.enabledModels || this.config.enabledModels.length === 0) {
              new Notice(t("settings.localLlmModal.modelRequired"));
              return;
            }
            void this.onSave(this.config, this.fetchedModels);
            this.close();
          });
        this.updateSaveButton();
      });
  }

  private updateSaveButton() {
    if (this.saveButton) {
      this.saveButton.disabled = !this.modelsFetched;
      this.saveButton.toggleClass("is-disabled", !this.modelsFetched);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
