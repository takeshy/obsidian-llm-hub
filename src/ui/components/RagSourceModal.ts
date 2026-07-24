import { Modal, App } from "obsidian";
import type { Attachment } from "src/types";
import { t } from "src/i18n";

export interface RagSourceModalResult {
  attachment: Attachment;
}

/**
 * Modal to view/edit a RAG search result text attachment.
 */
export class RagSourceModal extends Modal {
  private attachment: Attachment;
  private onResult: (result: RagSourceModalResult) => void;

  constructor(app: App, attachment: Attachment, onResult: (result: RagSourceModalResult) => void) {
    super(app);
    this.attachment = attachment;
    this.onResult = onResult;
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    contentEl.empty();
    modalEl.addClass("llm-hub-rag-text-modal");

    const att = this.attachment;

    // Header
    const header = contentEl.createDiv({ cls: "llm-hub-rag-text-modal-header" });
    header.createEl("h3", { text: att.name });
    if (att.sourcePath) {
      const pathEl = header.createDiv({
        cls: "llm-hub-rag-text-modal-path",
        text: att.sourcePath,
      });
      if (att.pageLabel) {
        pathEl.appendText(` (${att.pageLabel})`);
      }
    }

    // Textarea with decoded content
    const text = decodeAttachmentText(att.data);
    const textarea = contentEl.createEl("textarea", {
      cls: "llm-hub-rag-text-modal-textarea",
    });
    textarea.value = text;

    // Actions
    const actions = contentEl.createDiv({ cls: "llm-hub-modal-actions" });

    const saveBtn = actions.createEl("button", {
      text: t("common.save"),
      cls: "mod-cta",
    });
    saveBtn.addEventListener("click", () => {
      const newData = encodeAttachmentText(textarea.value);
      this.onResult({ attachment: { ...att, data: newData } });
      this.close();
    });

    const cancelBtn = actions.createEl("button", {
      text: t("common.cancel"),
    });
    cancelBtn.addEventListener("click", () => {
      this.close();
    });

    window.setTimeout(() => textarea.focus(), 50);
  }

  onClose() {
    this.contentEl.empty();
  }
}

function decodeAttachmentText(base64: string): string {
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return atob(base64);
  }
}

function encodeAttachmentText(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
