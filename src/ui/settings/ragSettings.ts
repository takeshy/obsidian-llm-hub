import { Setting, Notice } from "obsidian";
import { getLocalRagStore } from "src/core/localRagStore";
import { fetchEmbeddingModels } from "src/core/embeddingProvider";
import { t } from "src/i18n";
import { DEFAULT_GEMINI_EMBEDDING_MODEL, DEFAULT_RAG_SETTING, getGeminiApiKey } from "src/types";
import type { RagSetting } from "src/types";
import { ConfirmModal } from "src/ui/components/ConfirmModal";
import { formatError } from "src/utils/error";
import { RagSettingNameModal } from "./RagSettingNameModal";
import type { SettingsContext } from "./settingsContext";

type RagSettingMode = "internal" | "combined" | "external";

function getEffectiveEmbeddingModel(ragSetting: RagSetting): string {
  return ragSetting.embeddingModel || (ragSetting.embeddingBaseUrl ? "" : DEFAULT_GEMINI_EMBEDDING_MODEL);
}

function hasSameEmbeddingConfig(a: RagSetting, b: RagSetting): boolean {
  return a.embeddingBaseUrl.trim() === b.embeddingBaseUrl.trim()
    && getEffectiveEmbeddingModel(a) === getEffectiveEmbeddingModel(b);
}

export function displayRagSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  const { plugin, display } = ctx;
  const app = plugin.app;

  new Setting(containerEl).setName(t("settings.rag")).setHeading();

  const ragSettingNames = plugin.getRagSettingNames();
  const selectedName = plugin.workspaceState.selectedRagSetting;

  // RAG setting selection
  const ragSelectSetting = new Setting(containerEl)
    .setName(t("settings.ragSetting"))
    .setDesc(t("settings.ragSetting.desc"));

  ragSelectSetting.addDropdown((dropdown) => {
    ragSettingNames.forEach((name) => {
      dropdown.addOption(name, name);
    });

    dropdown.setValue(selectedName || "").onChange((value) => {
      void (async () => {
        await plugin.selectRagSetting(value || null);
        display();
      })();
    });
  });

  // Add new RAG setting button
  ragSelectSetting.addExtraButton((btn) => {
    btn
      .setIcon("plus")
      .setTooltip(t("settings.createRagSetting"))
      .onClick(() => {
        new RagSettingNameModal(
          app,
          t("settings.createRagSetting"),
          "",
          async (name) => {
            try {
              await plugin.createRagSetting(name);
              await plugin.selectRagSetting(name);
              display();
              new Notice(t("settings.ragSettingCreated", { name }));
            } catch (error) {
              new Notice(t("error.failedToCreate", { error: formatError(error) }));
            }
          }
        ).open();
      });
  });

  // Show selected RAG setting details
  if (selectedName) {
    const ragSetting = plugin.getRagSetting(selectedName);
    if (ragSetting) {
      displaySelectedRagSetting(containerEl, ctx, selectedName, ragSetting);
    }
  }
}

function displaySelectedRagSetting(
  containerEl: HTMLElement,
  ctx: SettingsContext,
  name: string,
  ragSetting: RagSetting
): void {
  const { plugin, display } = ctx;
  const app = plugin.app;

  // Setting header with rename/delete buttons
  const headerSetting = new Setting(containerEl)
    .setName(t("settings.settingsFor", { name }))
    .setDesc(t("settings.configureThisSetting"));

  headerSetting.addExtraButton((btn) => {
    btn
      .setIcon("pencil")
      .setTooltip(t("settings.renameSetting"))
      .onClick(() => {
        new RagSettingNameModal(
          app,
          t("settings.renameRagSetting"),
          name,
          async (newName) => {
            try {
              await plugin.renameRagSetting(name, newName);
              display();
              new Notice(t("settings.renamedTo", { name: newName }));
            } catch (error) {
              new Notice(t("error.failedToRename", { error: formatError(error) }));
            }
          }
        ).open();
      });
  });

  headerSetting.addExtraButton((btn) => {
    btn
      .setIcon("trash")
      .setTooltip(t("settings.deleteSetting"))
      .onClick(() => {
        void (async () => {
          const confirmed = await new ConfirmModal(
            app,
            t("settings.deleteSettingConfirm", { name }),
            t("common.delete"),
            t("common.cancel")
          ).openAndWait();
          if (!confirmed) return;

          try {
            await plugin.deleteRagSetting(name);
            display();
            new Notice(t("settings.ragSettingDeleted", { name }));
          } catch (error) {
            new Notice(t("error.failedToDelete", { error: formatError(error) }));
          }
        })();
      });
  });

  // All RAG is now local - go directly to local store settings
  displayLocalStoreSettings(containerEl, ctx, name, ragSetting);
}

function displayLocalStoreSettings(
  containerEl: HTMLElement,
  ctx: SettingsContext,
  name: string,
  ragSetting: RagSetting
): void {
  const { plugin, display } = ctx;
  const app = plugin.app;
  const isExternal = !!ragSetting.externalIndexPath;
  const isBundle = ragSetting.sourceRagSettings.length > 0;
  const mode: RagSettingMode = isBundle ? "combined" : isExternal ? "external" : "internal";
  const internalSourceNames = plugin.getRagSettingNames().filter(sourceName => {
    if (sourceName === name) return false;
    const source = plugin.getRagSetting(sourceName);
    return !!source && !source.externalIndexPath && source.sourceRagSettings.length === 0;
  });
  const sourceCompatibilityAnchorName = ragSetting.sourceRagSettings.find(sourceName =>
    internalSourceNames.includes(sourceName)
  ) ?? internalSourceNames[0];
  const sourceCompatibilityAnchor = sourceCompatibilityAnchorName
    ? plugin.getRagSetting(sourceCompatibilityAnchorName)
    : null;
  const compatibleSourceNames = sourceCompatibilityAnchor
    ? internalSourceNames.filter(sourceName => {
      const source = plugin.getRagSetting(sourceName);
      return !!source && hasSameEmbeddingConfig(sourceCompatibilityAnchor, source);
    })
    : [];

  // RAG index mode
  new Setting(containerEl)
    .setName(t("settings.ragMode"))
    .setDesc(t("settings.ragMode.desc"))
    .addDropdown((dropdown) => {
      dropdown
        .addOption("internal", t("settings.ragMode.internal"))
        .addOption("combined", t("settings.ragMode.combined"))
        .addOption("external", t("settings.ragMode.external"))
        .setValue(mode)
        .onChange((value) => {
          const nextMode = value as RagSettingMode;
          const compatibleSelectedSources = ragSetting.sourceRagSettings.filter(sourceName =>
            compatibleSourceNames.includes(sourceName)
          );
          const sourceRagSettings = nextMode === "combined"
            ? (compatibleSelectedSources.length > 0 ? compatibleSelectedSources : compatibleSourceNames.slice(0, 1))
            : [];
          const externalIndexPath = nextMode === "external" ? (ragSetting.externalIndexPath || " ") : "";
          void (async () => {
            await plugin.updateRagSetting(name, { sourceRagSettings, externalIndexPath });
            getLocalRagStore()?.setExternalPath(name, externalIndexPath);
            getLocalRagStore()?.setSourceRagSettings(name, sourceRagSettings);
            display();
          })();
        });
    });

  if (isBundle) {
    const sourceSetting = new Setting(containerEl)
      .setName(t("settings.ragSourceSettings"))
      .setDesc(t("settings.ragSourceSettings.desc"));
    const sourceContainer = sourceSetting.controlEl.createDiv({ cls: "llm-hub-rag-source-settings" });
    if (compatibleSourceNames.length === 0) {
      sourceContainer.setText(t("settings.ragSourceSettings.empty"));
    } else {
      for (const sourceName of compatibleSourceNames) {
        const label = sourceContainer.createEl("label", { cls: "llm-hub-rag-source-setting-option" });
        const checkbox = label.createEl("input", {
          type: "checkbox",
          value: sourceName,
        });
        checkbox.checked = ragSetting.sourceRagSettings.includes(sourceName);
        label.createSpan({ text: sourceName });
        checkbox.addEventListener("change", () => {
          void (async () => {
            const nextSources = checkbox.checked
              ? [...ragSetting.sourceRagSettings, sourceName]
              : ragSetting.sourceRagSettings.filter(item => item !== sourceName);
            const uniqueSources = [...new Set(nextSources)].filter(item => compatibleSourceNames.includes(item));
            await plugin.updateRagSetting(name, { sourceRagSettings: uniqueSources });
            getLocalRagStore()?.setSourceRagSettings(name, uniqueSources);
            display();
          })();
        });
      }
    }

    displayTopKSetting(containerEl, plugin, name, ragSetting, display);
    displayScoreThresholdSetting(containerEl, plugin, name, ragSetting, display);
    displayIndexStatus(containerEl, app, name, ragSetting);
  } else if (isExternal) {
    const refreshExternalIndexModel = displayExternalIndexModel(containerEl, app, name);

    // --- External index mode ---
    // External Index Path
    new Setting(containerEl)
      .setName(t("settings.externalIndexPath"))
      .setDesc(t("settings.externalIndexPath.desc"))
      .addTextArea((text) => {
        text
          .setPlaceholder(t("settings.externalIndexPath.placeholder"))
          .setValue(ragSetting.externalIndexPath.trim())
          .onChange((value) => {
            void (async () => {
              const path = value.trim() || " "; // keep toggle on
              await plugin.updateRagSetting(name, { externalIndexPath: path });
              getLocalRagStore()?.setExternalPath(name, path);
              refreshExternalIndexModel();
            })();
          });
        text.inputEl.rows = 4;
        text.inputEl.addClass("gemini-helper-settings-textarea");
      });

    // Embedding server URL for query embedding
    new Setting(containerEl)
      .setName(t("settings.localEmbeddingBaseUrl"))
      .setDesc(t("settings.externalEmbeddingBaseUrl.desc"))
      .addText((text) =>
        text
          .setPlaceholder(t("settings.localEmbeddingBaseUrl.placeholder"))
          .setValue(ragSetting.embeddingBaseUrl)
          .onChange((value) => {
            void (async () => {
              await plugin.updateRagSetting(name, { embeddingBaseUrl: value.trim() });
            })();
          })
      );

    // Embedding API Key (optional)
    new Setting(containerEl)
      .setName(t("settings.localEmbeddingApiKey"))
      .setDesc(t("settings.localEmbeddingApiKey.desc"))
      .addText((text) => {
        text
          .setPlaceholder(t("settings.localEmbeddingApiKey.placeholder"))
          .setValue(ragSetting.embeddingApiKey)
          .onChange((value) => {
            void (async () => {
              await plugin.updateRagSetting(name, { embeddingApiKey: value.trim() });
            })();
          });
        text.inputEl.type = "password";
      });

    // Top K (per-setting)
    displayTopKSetting(containerEl, plugin, name, ragSetting, display);

    // Score threshold
    displayScoreThresholdSetting(containerEl, plugin, name, ragSetting, display);

    // Index status
    displayIndexStatus(containerEl, app, name, ragSetting);
  } else {
    // --- Vault sync mode ---
    // Embedding server settings
    displayEmbeddingSettings(containerEl, plugin, name, ragSetting);

    // Top K (per-setting)
    displayTopKSetting(containerEl, plugin, name, ragSetting, display);

    // Target Folders
    new Setting(containerEl)
      .setName(t("settings.targetFolders"))
      .setDesc(t("settings.targetFolders.desc"))
      .addText((text) =>
        text
          .setPlaceholder(t("settings.targetFolders.placeholder"))
          .setValue(ragSetting.targetFolders.join(", "))
          .onChange((value) => {
            void (async () => {
              const folders = value
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
              await plugin.updateRagSetting(name, { targetFolders: folders });
            })();
          })
      );

    // Excluded Patterns
    const excludePatternsSetting = new Setting(containerEl)
      .setName(t("settings.excludedPatterns"))
      .setDesc(t("settings.excludedPatterns.desc"));

    excludePatternsSetting.settingEl.addClass("gemini-helper-settings-textarea-container");

    excludePatternsSetting.addTextArea((text) => {
      text
        .setPlaceholder(t("settings.excludedPatterns.placeholder"))
        .setValue(ragSetting.excludePatterns.join("\n"))
        .onChange((value) => {
          void (async () => {
            const patterns = value
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            await plugin.updateRagSetting(name, { excludePatterns: patterns });
          })();
        });
      text.inputEl.rows = 4;
      text.inputEl.addClass("gemini-helper-settings-textarea");
    });

    // Index status
    displayIndexStatus(containerEl, app, name, ragSetting);

    // Sync
    displaySyncControls(containerEl, ctx, name, ragSetting);

    // Clear index
    new Setting(containerEl)
      .setName(t("settings.localClearIndex"))
      .setDesc(t("settings.localClearIndex.desc"))
      .addButton((btn) =>
        btn
          .setButtonText(t("settings.localClearIndex"))
          .setWarning()
          .onClick(() => {
            void (async () => {
              const confirmed = await new ConfirmModal(
                app,
                t("settings.localClearConfirm"),
                t("common.delete"),
                t("common.cancel")
              ).openAndWait();
              if (!confirmed) return;

              try {
                await plugin.clearLocalRagIndex(name);
                new Notice(t("settings.localIndexCleared"));
                display();
              } catch (error) {
                new Notice(formatError(error));
              }
            })();
          })
      );
  }
}

/** Embedding server fields (URL, API key, model, chunk size/overlap) */
function displayEmbeddingSettings(
  containerEl: HTMLElement,
  plugin: SettingsContext["plugin"],
  name: string,
  ragSetting: RagSetting
): void {
  // Custom Embedding Base URL
  new Setting(containerEl)
    .setName(t("settings.localEmbeddingBaseUrl"))
    .setDesc(t("settings.localEmbeddingBaseUrl.desc"))
    .addText((text) =>
      text
        .setPlaceholder(t("settings.localEmbeddingBaseUrl.placeholder"))
        .setValue(ragSetting.embeddingBaseUrl)
        .onChange((value) => {
          void (async () => {
            await plugin.updateRagSetting(name, { embeddingBaseUrl: value.trim() });
          })();
        })
    );

  // Custom Embedding API Key
  new Setting(containerEl)
    .setName(t("settings.localEmbeddingApiKey"))
    .setDesc(t("settings.localEmbeddingApiKey.desc"))
    .addText((text) => {
      text
        .setPlaceholder(t("settings.localEmbeddingApiKey.placeholder"))
        .setValue(ragSetting.embeddingApiKey)
        .onChange((value) => {
          void (async () => {
            await plugin.updateRagSetting(name, { embeddingApiKey: value.trim() });
          })();
        });
      text.inputEl.type = "password";
    });

  // Embedding model (dropdown + fetch button, fallback to text input)
  const embeddingModelSetting = new Setting(containerEl)
    .setName(t("settings.localEmbeddingModel"))
    .setDesc(t("settings.localEmbeddingModel.desc"));

  let embeddingDropdown: HTMLSelectElement | null = null;
  let embeddingModelInput: HTMLInputElement | null = null;

  // Dropdown (primary)
  embeddingModelSetting.controlEl.createEl("select", {}, (select) => {
    embeddingDropdown = select;
    select.addClass("dropdown");
    if (!ragSetting.embeddingModel) {
      const placeholder = select.createEl("option", { text: t("settings.localEmbeddingModel.desc"), value: "" });
      placeholder.disabled = true;
      placeholder.selected = true;
    } else {
      const opt = select.createEl("option", { text: ragSetting.embeddingModel, value: ragSetting.embeddingModel });
      opt.selected = true;
    }
    select.addEventListener("change", () => {
      void plugin.updateRagSetting(name, { embeddingModel: select.value });
    });
  });

  // Text input (hidden by default, shown when fetch fails)
  embeddingModelSetting.addText((text) => {
    embeddingModelInput = text.inputEl;
    text
      .setPlaceholder(t("settings.localEmbeddingModel.desc"))
      .setValue(ragSetting.embeddingModel)
      .onChange((value) => {
        void plugin.updateRagSetting(name, { embeddingModel: value.trim() });
      });
    text.inputEl.addClass("llm-hub-hidden");
  });

  embeddingModelSetting.addButton((btn) =>
    btn
      .setButtonText(t("settings.localLlmModal.fetchModels"))
      .onClick(async () => {
        btn.setButtonText(t("settings.localLlmModal.fetching"));
        btn.setDisabled(true);
        try {
          const current = plugin.getRagSetting(name) ?? ragSetting;
          const apiKey = current.embeddingApiKey || getGeminiApiKey(plugin.settings);
          const models = await fetchEmbeddingModels(apiKey, current.embeddingBaseUrl || undefined, plugin.settings.proxyUrl, plugin.settings.proxyBypass);
          if (models.length === 0) {
            // Show text input as fallback
            if (embeddingDropdown) embeddingDropdown.addClass("llm-hub-hidden");
            if (embeddingModelInput) embeddingModelInput.removeClass("llm-hub-hidden");
            new Notice(t("settings.localLlmModal.noModelsFound"));
            return;
          }
          // Show dropdown, hide text input
          if (embeddingDropdown) embeddingDropdown.removeClass("llm-hub-hidden");
          if (embeddingModelInput) embeddingModelInput.addClass("llm-hub-hidden");
          if (embeddingDropdown) {
            embeddingDropdown.empty();
            for (const model of models) {
              const opt = embeddingDropdown.createEl("option", { text: model, value: model });
              if (model === current.embeddingModel) {
                opt.selected = true;
              }
            }
            if (!current.embeddingModel || !models.includes(current.embeddingModel)) {
              const selected = models[0];
              await plugin.updateRagSetting(name, { embeddingModel: selected });
              embeddingDropdown.value = selected;
            }
          }
          new Notice(t("settings.localLlmModal.modelsLoaded", { count: String(models.length) }));
        } catch (err) {
          new Notice(`Error: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          btn.setButtonText(t("settings.localLlmModal.fetchModels"));
          btn.setDisabled(false);
        }
      })
  );

  // Chunk size
  new Setting(containerEl)
    .setName(t("settings.localChunkSize"))
    .setDesc(t("settings.localChunkSize.desc"))
    .addSlider((slider) =>
      slider
        .setLimits(100, 2000, 50)
        .setValue(ragSetting.chunkSize)
        .setDynamicTooltip()
        .onChange((value) => {
          void (async () => {
            await plugin.updateRagSetting(name, { chunkSize: value });
          })();
        })
    );

  // Chunk overlap
  new Setting(containerEl)
    .setName(t("settings.localChunkOverlap"))
    .setDesc(t("settings.localChunkOverlap.desc"))
    .addSlider((slider) =>
      slider
        .setLimits(0, 500, 10)
        .setValue(ragSetting.chunkOverlap)
        .setDynamicTooltip()
        .onChange((value) => {
          void (async () => {
            await plugin.updateRagSetting(name, { chunkOverlap: value });
          })();
        })
    );

  // PDF chunk pages
  new Setting(containerEl)
    .setName(t("settings.localPdfChunkPages"))
    .setDesc(t("settings.localPdfChunkPages.desc"))
    .addSlider((slider) =>
      slider
        .setLimits(1, 6, 1)
        .setValue(ragSetting.pdfChunkPages ?? 6)
        .setDynamicTooltip()
        .onChange((value) => {
          void (async () => {
            await plugin.updateRagSetting(name, { pdfChunkPages: value });
          })();
        })
    );

  // indexMultimodal is now automatically determined by embedding model (gemini-embedding-*)
}

/** Show embedding model detected from external index (read-only) */
function displayExternalIndexModel(
  containerEl: HTMLElement,
  app: SettingsContext["plugin"]["app"],
  name: string
): () => void {
  const modelSetting = new Setting(containerEl)
    .setName(t("settings.externalIndexModel"))
    .setDesc(t("settings.externalIndexModel.desc"));

  const modelDisplay = modelSetting.controlEl.createSpan({
    text: t("settings.externalIndexModel.loading"),
  });

  const refresh = () => {
    const localRag = getLocalRagStore();
    if (!localRag) {
      modelDisplay.textContent = t("settings.externalIndexModel.notFound");
      return;
    }

    modelDisplay.textContent = t("settings.externalIndexModel.loading");
    void (async () => {
      const status = await localRag.getStatus(app, name);
      modelDisplay.textContent = status.embeddingModel || t("settings.externalIndexModel.notFound");
    })();
  };

  refresh();
  return refresh;
}

/** Top K slider */
function displayTopKSetting(
  containerEl: HTMLElement,
  plugin: SettingsContext["plugin"],
  name: string,
  ragSetting: RagSetting,
  display: () => void
): void {
  new Setting(containerEl)
    .setName(t("settings.retrievedChunksLimit"))
    .setDesc(t("settings.retrievedChunksLimit.desc"))
    .addSlider((slider) =>
      slider
        .setLimits(1, 20, 1)
        .setValue(ragSetting.topK)
        .setDynamicTooltip()
        .onChange((value) => {
          void (async () => {
            await plugin.updateRagSetting(name, { topK: value });
          })();
        })
    )
    .addExtraButton((button) =>
      button
        .setIcon("reset")
        .setTooltip(t("settings.resetToDefault", { value: String(DEFAULT_RAG_SETTING.topK) }))
        .onClick(() => {
          void (async () => {
            await plugin.updateRagSetting(name, { topK: DEFAULT_RAG_SETTING.topK });
            display();
          })();
        })
    );
}

/** Score threshold slider */
function displayScoreThresholdSetting(
  containerEl: HTMLElement,
  plugin: SettingsContext["plugin"],
  name: string,
  ragSetting: RagSetting,
  display: () => void
): void {
  const currentValue = ragSetting.scoreThreshold ?? DEFAULT_RAG_SETTING.scoreThreshold;
  new Setting(containerEl)
    .setName(t("settings.scoreThreshold"))
    .setDesc(t("settings.scoreThreshold.desc"))
    .addSlider((slider) => {
      slider
        .setLimits(0, 10, 1)
        .setValue(Math.round(currentValue * 10))
        .setDynamicTooltip()
        .onChange((value) => {
          void (async () => {
            await plugin.updateRagSetting(name, { scoreThreshold: value / 10 });
          })();
        });
      // Show 0.0-1.0 instead of 0-10
      const tooltipEl = slider.sliderEl.nextElementSibling;
      if (tooltipEl) {
        const updateTooltip = () => { tooltipEl.textContent = (slider.getValue() / 10).toFixed(1); };
        updateTooltip();
        slider.sliderEl.addEventListener("input", updateTooltip);
      }
    })
    .addExtraButton((button) =>
      button
        .setIcon("reset")
        .setTooltip(t("settings.resetToDefault", { value: String(DEFAULT_RAG_SETTING.scoreThreshold) }))
        .onClick(() => {
          void (async () => {
            await plugin.updateRagSetting(name, { scoreThreshold: DEFAULT_RAG_SETTING.scoreThreshold });
            display();
          })();
        })
    );
}

/** Index status display (chunk/file count) */
function displayIndexStatus(
  containerEl: HTMLElement,
  app: SettingsContext["plugin"]["app"],
  name: string,
  ragSetting: RagSetting
): void {
  const localRag = getLocalRagStore();
  const lastSync = ragSetting.lastFullSync
    ? new Date(ragSetting.lastFullSync).toLocaleString()
    : t("settings.syncStatusNever");

  const statusSetting = new Setting(containerEl)
    .setName(t("settings.localSyncStatus", { chunks: "0", files: "0" }))
    .setDesc(lastSync);

  if (localRag) {
    void (async () => {
      const status = await localRag.getStatus(app, name);
      statusSetting.setName(
        t("settings.localSyncStatus", {
          chunks: String(status.chunkCount),
          files: String(status.fileCount),
        })
      );
    })();
  }
}

/** Sync button + progress bar */
function displaySyncControls(
  containerEl: HTMLElement,
  ctx: SettingsContext,
  name: string,
  ragSetting: RagSetting
): void {
  const { plugin, display, syncCancelRef } = ctx;

  const progressContainer = containerEl.createDiv({
    cls: "gemini-helper-sync-progress",
  });
  progressContainer.addClass("gemini-helper-hidden");

  const progressText = progressContainer.createDiv();
  const progressBar = progressContainer.createEl("progress");
  progressBar.addClass("gemini-helper-progress-bar");

  let cancelBtn: HTMLButtonElement | null = null;

  const syncSetting = new Setting(containerEl)
    .setName(t("settings.localSyncBtn"));

  syncSetting
    .addButton((btn) => {
      cancelBtn = btn.buttonEl;
      btn
        .setButtonText(t("settings.cancelSync"))
        .setWarning()
        .onClick(() => {
          syncCancelRef.value = true;
          new Notice(t("settings.cancellingSync"));
        });
      btn.buttonEl.addClass("gemini-helper-hidden");
    })
    .addButton((btn) =>
      btn
        .setButtonText(t("settings.localSyncBtn"))
        .setCta()
        .setDisabled(!ragSetting.embeddingApiKey && !getGeminiApiKey(plugin.settings))
        .onClick(() => {
          void (async () => {
            syncCancelRef.value = false;
            btn.setDisabled(true);
            btn.setButtonText(t("settings.localSyncing"));
            if (cancelBtn) cancelBtn.removeClass("gemini-helper-hidden");
            progressContainer.removeClass("gemini-helper-hidden");
            progressText.removeClass("gemini-helper-progress-error");
            progressText.textContent = t("settings.syncPreparing");
            progressBar.value = 0;
            progressBar.max = 100;

            try {
              const result = await plugin.syncVaultForLocalRAG(
                name,
                (current, total, fileName, action) => {
                  if (syncCancelRef.value) {
                    throw new Error("Cancelled by user");
                  }
                  const percent = Math.round((current / total) * 100);
                  progressBar.value = percent;
                  progressBar.max = 100;

                  const actionText =
                    action === "embed"
                      ? t("settings.localSyncEmbedding")
                      : action === "skip"
                        ? t("settings.localSyncSkipping")
                        : t("settings.localSyncRemoving");
                  progressText.textContent = `${actionText}: ${fileName} (${current}/${total})`;
                }
              );
              if (result) {
                new Notice(
                  t("settings.localSyncResult", {
                    embedded: String(result.embedded),
                    skipped: String(result.skipped),
                    removed: String(result.removed),
                  })
                );
                if (result.failedFiles && result.failedFiles.length > 0) {
                  new Notice(t("settings.localSyncFilesFailed", {
                    count: String(result.failedFiles.length),
                    files: result.failedFiles.join("\n"),
                  }));
                }
                if (result.errors.length > 0) {
                  const errorSummary = result.errors.slice(0, 3).join("\n");
                  const suffix = result.errors.length > 3 ? `\n...and ${result.errors.length - 3} more` : "";
                  new Notice(`Sync errors:\n${errorSummary}${suffix}`, 10000);
                }
              }
            } catch (error) {
              const msg = formatError(error);
              if (msg === "Cancelled by user") {
                new Notice(t("settings.syncCancelled"));
                progressText.textContent = t("settings.syncCancelled");
              } else {
                new Notice(t("settings.syncFailed", { error: msg }));
                progressText.textContent = `${t("common.error")}${msg}`;
                progressText.addClass("gemini-helper-progress-error");
              }
            } finally {
              btn.setDisabled(false);
              btn.setButtonText(t("settings.localSyncBtn"));
              if (cancelBtn) cancelBtn.addClass("gemini-helper-hidden");
              syncCancelRef.value = false;
              setTimeout(() => {
                progressContainer.addClass("gemini-helper-hidden");
                display();
              }, 2000);
            }
          })();
        })
    );
}
