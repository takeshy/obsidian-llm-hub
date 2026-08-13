import { Modal, App, Setting, Notice } from "obsidian";
import { isWindows, listCodexModels, validateCliPath } from "src/core/cliProvider";
import { t } from "src/i18n";
import type { CodexReasoningEffort } from "src/types";

export type CliType = "gemini" | "claude" | "codex";

export class CliPathModal extends Modal {
  private cliType: CliType;
  private currentPath: string;
  private currentModel: string;
  private currentReasoningEffort: CodexReasoningEffort;
  private onSave: (path: string | undefined, model?: string, reasoningEffort?: CodexReasoningEffort) => void | Promise<void>;

  constructor(
    app: App,
    cliType: CliType,
    currentPath: string | undefined,
    currentModel: string | undefined,
    currentReasoningEffort: CodexReasoningEffort | undefined,
    onSave: (path: string | undefined, model?: string, reasoningEffort?: CodexReasoningEffort) => void | Promise<void>
  ) {
    super(app);
    this.cliType = cliType;
    this.currentPath = currentPath || "";
    this.currentModel = currentModel || "";
    this.currentReasoningEffort = currentReasoningEffort || "low";
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("llm-hub-cli-path-modal");
    contentEl.createEl("h2", { text: t("settings.cliPathModal.title") });

    // Description
    const descEl = contentEl.createDiv({ cls: "llm-hub-cli-path-desc" });
    descEl.textContent = t("settings.cliPathModal.desc");

    const cliName = this.cliType === "gemini" ? "Antigravity" : this.cliType === "claude" ? "Claude" : "Codex";

    new Setting(contentEl)
      .setName(cliName + " CLI")
      .addText((text) => {
        text
          .setPlaceholder(t("settings.cliPathModal.placeholder"))
          .setValue(this.currentPath)
          .onChange((value) => {
            this.currentPath = value;
          });
        text.inputEl.addClass("llm-hub-cli-path-input");
        text.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.save();
          }
        });
      });

    if (this.cliType === "codex") {
      const modelSetting = new Setting(contentEl)
        .setName(t("settings.codexCliModel"))
        .setDesc(t("settings.codexCliModel.desc"));
      modelSetting.addDropdown((dropdown) => {
        dropdown.addOption("", t("settings.codexCliModel.default"));
        if (this.currentModel) dropdown.addOption(this.currentModel, this.currentModel);
        dropdown.setValue(this.currentModel);
        dropdown.selectEl.disabled = true;
        dropdown.onChange((model) => {
          this.currentModel = model;
        });

        void listCodexModels(this.currentPath || undefined)
          .then((models) => {
            dropdown.selectEl.empty();
            dropdown.addOption("", t("settings.codexCliModel.default"));
            for (const model of models) {
              dropdown.addOption(model.slug, `${model.displayName} (${model.slug})`);
            }
            if (this.currentModel && !models.some((model) => model.slug === this.currentModel)) {
              dropdown.addOption(this.currentModel, this.currentModel);
            }
            dropdown.setValue(this.currentModel);
          })
          .catch(() => {
            modelSetting.setDesc(t("settings.codexCliModel.loadFailed"));
          })
          .finally(() => {
            dropdown.selectEl.disabled = false;
          });
      });

      new Setting(contentEl)
        .setName(t("settings.codexCliReasoningEffort"))
        .setDesc(t("settings.codexCliReasoningEffort.desc"))
        .addDropdown((dropdown) => {
          const efforts: CodexReasoningEffort[] = ["minimal", "low", "medium", "high", "xhigh"];
          for (const effort of efforts) dropdown.addOption(effort, effort);
          dropdown.setValue(this.currentReasoningEffort);
          dropdown.onChange((effort) => {
            this.currentReasoningEffort = effort as CodexReasoningEffort;
          });
        });
    }

    // Show OS-specific help note
    const noteEl = contentEl.createDiv({ cls: "llm-hub-cli-path-note" });
    noteEl.textContent = isWindows()
      ? t("settings.cliPathModal.windowsNote")
      : t("settings.cliPathModal.unixNote");

    // Version manager note (non-Windows only)
    if (!isWindows()) {
      const vmNoteEl = contentEl.createDiv({ cls: "llm-hub-cli-path-note" });
      vmNoteEl.textContent = t("settings.cliPathModal.versionManagerNote");
    }

    new Setting(contentEl)
      .addButton((btn) =>
        btn.setButtonText(t("settings.cliPathModal.clear")).onClick(() => {
          void this.clear();
        })
      )
      .addButton((btn) =>
        btn.setButtonText(t("common.cancel")).onClick(() => {
          this.close();
        })
      )
      .addButton((btn) =>
        btn
          .setButtonText(t("common.save"))
          .setCta()
          .onClick(() => {
            this.save();
          })
      );
  }

  private save() {
    const path = this.currentPath.trim();
    if (path) {
      const result = validateCliPath(path);
      if (!result.valid) {
        if (result.reason === "file_not_found") {
          new Notice(t("settings.cliPathModal.fileNotFound"));
        } else {
          new Notice(t("settings.cliPathModal.invalidChars"));
        }
        return;
      }
    }
    void this.onSave(path || undefined, this.currentModel || undefined, this.currentReasoningEffort);
    this.close();
  }

  private async clear() {
    await this.onSave(undefined, this.currentModel || undefined, this.currentReasoningEffort);
    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
