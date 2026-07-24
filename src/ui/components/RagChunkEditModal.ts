import { Modal, App, Notice } from "obsidian";
import { getLocalRagStore, type LocalRagSearchResult } from "src/core/localRagStore";
import { extractPdfText } from "src/vault/search";
import { streamChatForModel } from "src/core/modelStreaming";
import type { LlmHubSettings, ModelType, Message } from "src/types";
import { t } from "src/i18n";

export interface RagChunkEditResult {
  text: string;
  refined?: boolean;
  firstChunkText: string;
  lastChunkText: string;
}

const MAX_EXPAND_ITERATIONS = 5;
const CHUNKS_PER_LOAD = 3;

/**
 * Modal to edit a RAG search result text with adjacent chunk loading
 * and AI-powered refinement.
 */
export class RagChunkEditModal extends Modal {
  private result: LocalRagSearchResult;
  private ragSettingName: string;
  private searchQuery: string;
  private settings: LlmHubSettings;
  private model: ModelType;
  private onResult: (result: RagChunkEditResult) => void;
  private textarea: HTMLTextAreaElement | null = null;
  private prevContainer: HTMLDivElement | null = null;
  private nextContainer: HTMLDivElement | null = null;
  private firstChunkText: string;
  private lastChunkText: string;
  private hasPrev = true;
  private hasNext = true;
  private abortController: AbortController | null = null;
  private readonly isRefined: boolean;
  private wasRefined = false;

  constructor(
    app: App,
    result: LocalRagSearchResult,
    ragSettingName: string,
    searchQuery: string,
    settings: LlmHubSettings,
    model: ModelType,
    refined: boolean,
    onResult: (result: RagChunkEditResult) => void,
    boundary?: { first: string; last: string },
  ) {
    super(app);
    this.result = result;
    this.ragSettingName = ragSettingName;
    this.searchQuery = searchQuery;
    this.settings = settings;
    this.model = model;
    this.isRefined = refined;
    this.onResult = onResult;
    this.firstChunkText = boundary?.first ?? result.text;
    this.lastChunkText = boundary?.last ?? result.text;
  }

  onOpen() {
    const { contentEl, modalEl } = this;
    modalEl.addClass("llm-hub-rag-chunk-edit-modal");

    // Header
    const header = contentEl.createDiv({ cls: "llm-hub-rag-chunk-edit-header" });
    const fileName = this.result.filePath.split("/").pop() || this.result.filePath;
    header.createEl("h3", { text: fileName });
    const pathEl = header.createDiv({
      cls: "llm-hub-rag-text-modal-path",
      text: this.result.filePath,
    });
    if (this.result.pageLabel) {
      pathEl.appendText(` (${this.result.pageLabel})`);
    }

    if (!this.isRefined) {
      // Prev chunk link
      this.prevContainer = contentEl.createDiv({ cls: "llm-hub-rag-chunk-nav" });
      this.createLink("prev");
    }

    // Textarea
    this.textarea = contentEl.createEl("textarea", {
      cls: "llm-hub-rag-chunk-edit-textarea",
    });
    this.textarea.value = this.result.text;

    if (!this.isRefined) {
      // Next chunk link
      this.nextContainer = contentEl.createDiv({ cls: "llm-hub-rag-chunk-nav" });
      this.createLink("next");
    }

    // Actions
    const actions = contentEl.createDiv({ cls: "llm-hub-modal-actions" });

    if (!this.isRefined) {
      const refineBtn = actions.createEl("button", {
        text: `✨ ${t("search.refineWithAI")}`,
      });
      if (!this.model) {
        refineBtn.disabled = true;
        refineBtn.title = t("search.refineModelRequired");
      } else {
        refineBtn.addEventListener("click", () => {
          void this.refineWithAI(refineBtn);
        });
      }
    }

    const saveBtn = actions.createEl("button", {
      text: t("common.save"),
      cls: "mod-cta",
    });
    saveBtn.addEventListener("click", () => {
      this.onResult({
        text: this.textarea?.value ?? "",
        refined: this.wasRefined || undefined,
        firstChunkText: this.firstChunkText,
        lastChunkText: this.lastChunkText,
      });
      this.close();
    });

    const cancelBtn = actions.createEl("button", {
      text: t("common.cancel"),
    });
    cancelBtn.addEventListener("click", () => {
      this.close();
    });

    window.setTimeout(() => this.textarea?.focus(), 50);
  }

  onClose() {
    this.abortController?.abort();
    this.contentEl.empty();
  }

  private createLink(direction: "prev" | "next") {
    const container = direction === "prev" ? this.prevContainer : this.nextContainer;
    if (!container) return;
    container.empty();
    const isPrev = direction === "prev";
    const link = container.createEl("a", {
      cls: "llm-hub-rag-chunk-link",
      text: isPrev ? `▲ ${t("search.loadPrevChunk")}` : `▼ ${t("search.loadNextChunk")}`,
    });
    link.addEventListener("click", (e) => {
      e.preventDefault();
      void this.loadChunk(direction);
    });
  }

  private hideLink(direction: "prev" | "next") {
    const container = direction === "prev" ? this.prevContainer : this.nextContainer;
    if (container) container.empty();
  }

  private getNonOverlappingText(
    existingText: string, newChunkText: string, direction: "prev" | "next",
  ): string {
    if (direction === "next") {
      const maxOverlap = Math.min(existingText.length, newChunkText.length);
      let overlapLen = 0;
      for (let len = maxOverlap; len > 0; len--) {
        const suffix = existingText.slice(-len);
        if (newChunkText.startsWith(suffix)) {
          overlapLen = len;
          break;
        }
      }
      return newChunkText.slice(overlapLen);
    } else {
      const maxOverlap = Math.min(existingText.length, newChunkText.length);
      let overlapLen = 0;
      for (let len = maxOverlap; len > 0; len--) {
        const prefix = existingText.slice(0, len);
        if (newChunkText.endsWith(prefix)) {
          overlapLen = len;
          break;
        }
      }
      return newChunkText.slice(0, newChunkText.length - overlapLen);
    }
  }

  private async loadChunk(direction: "prev" | "next"): Promise<void> {
    const store = getLocalRagStore();
    if (!store || !this.textarea) return;

    const chunkText = direction === "prev" ? this.firstChunkText : this.lastChunkText;
    const adjacent = await store.getAdjacentChunk(
      this.app, this.ragSettingName, this.result.filePath, chunkText, direction,
    );

    if (!adjacent) {
      if (direction === "prev") this.hasPrev = false;
      else this.hasNext = false;
      this.hideLink(direction);
      return;
    }

    // For PDF chunks, the stored text is just a metadata label — extract real text
    let displayText = adjacent.text;
    if (adjacent.contentType === "pdf" && /^\[Pdf:/i.test(adjacent.text) && adjacent.pageLabel) {
      const pageMatch = adjacent.pageLabel.match(/pages?\s+(\d+)\s*-\s*(\d+)/i);
      const startPage = pageMatch ? parseInt(pageMatch[1], 10) : undefined;
      const endPage = pageMatch ? parseInt(pageMatch[2], 10) : undefined;
      const extracted = await extractPdfText(this.app, adjacent.filePath, startPage, endPage);
      if (extracted) displayText = extracted;
    }

    const currentText = this.textarea.value;
    const newPart = this.getNonOverlappingText(currentText, displayText, direction);

    if (direction === "prev") {
      this.firstChunkText = adjacent.text;
      if (newPart.trim()) {
        this.textarea.value = newPart + "\n\n" + currentText;
      }
      const morePrev = await store.getAdjacentChunk(
        this.app, this.ragSettingName, this.result.filePath, adjacent.text, "prev",
      );
      if (!morePrev) { this.hasPrev = false; this.hideLink("prev"); }
    } else {
      this.lastChunkText = adjacent.text;
      if (newPart.trim()) {
        this.textarea.value = currentText + "\n\n" + newPart;
      }
      const moreNext = await store.getAdjacentChunk(
        this.app, this.ragSettingName, this.result.filePath, adjacent.text, "next",
      );
      if (!moreNext) { this.hasNext = false; this.hideLink("next"); }
    }
  }

  /** Collect full LLM response as a string. */
  private async llmChat(userContent: string, systemPrompt: string): Promise<string> {
    const messages: Message[] = [
      { role: "user", content: userContent, timestamp: Date.now() },
    ];
    let result = "";
    for await (const chunk of streamChatForModel(
      this.model, messages, systemPrompt, this.settings, this.abortController?.signal,
    )) {
      if (chunk.type === "text" && chunk.content) {
        result += chunk.content;
      } else if (chunk.type === "error" && chunk.error) {
        throw new Error(chunk.error);
      }
    }
    return result;
  }

  /** Load multiple chunks in one direction. */
  private async loadChunks(direction: "prev" | "next", count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      if (direction === "prev" && !this.hasPrev) break;
      if (direction === "next" && !this.hasNext) break;
      await this.loadChunk(direction);
    }
  }

  /** Collect N adjacent chunk texts without touching textarea. */
  private async collectChunks(direction: "prev" | "next", count: number): Promise<LocalRagSearchResult[]> {
    const store = getLocalRagStore();
    if (!store) return [];
    const collected: LocalRagSearchResult[] = [];
    let anchor = direction === "prev" ? this.firstChunkText : this.lastChunkText;
    for (let i = 0; i < count; i++) {
      const adj = await store.getAdjacentChunk(
        this.app, this.ragSettingName, this.result.filePath, anchor, direction,
      );
      if (!adj) {
        if (direction === "prev") this.hasPrev = false;
        else this.hasNext = false;
        break;
      }
      collected.push(adj);
      anchor = adj.text;
    }
    return collected;
  }

  /** Apply collected chunks to textarea. */
  private applyCollectedChunks(prevChunks: LocalRagSearchResult[], nextChunks: LocalRagSearchResult[]): void {
    if (!this.textarea) return;
    // Apply prev chunks (collected in reverse order: nearest first)
    for (const chunk of prevChunks) {
      const currentText = this.textarea.value;
      const newPart = this.getNonOverlappingText(currentText, chunk.text, "prev");
      this.firstChunkText = chunk.text;
      if (newPart.trim()) {
        this.textarea.value = newPart + "\n\n" + currentText;
      }
    }
    // Apply next chunks
    for (const chunk of nextChunks) {
      const currentText = this.textarea.value;
      const newPart = this.getNonOverlappingText(currentText, chunk.text, "next");
      this.lastChunkText = chunk.text;
      if (newPart.trim()) {
        this.textarea.value = currentText + "\n\n" + newPart;
      }
    }
  }

  /**
   * AI-driven chunk expansion + refinement.
   * 1. Ask AI whether more context is needed (prev/next/both/ready)
   * 2. Load CHUNKS_PER_LOAD chunks as directed, repeat until ready or limits hit
   * 3. Ask AI to refine the accumulated text
   */
  private async refineWithAI(btn: HTMLButtonElement): Promise<void> {
    if (!this.textarea) return;

    const store = getLocalRagStore();
    if (!store) return;

    btn.disabled = true;
    this.textarea.disabled = true;
    this.hideLink("prev");
    this.hideLink("next");
    this.abortController = new AbortController();

    try {
      // Phase 1: Load initial prev/next chunks in parallel
      const [prevChunks, nextChunks] = await Promise.all([
        this.collectChunks("prev", CHUNKS_PER_LOAD),
        this.collectChunks("next", CHUNKS_PER_LOAD),
      ]);
      this.applyCollectedChunks(prevChunks, nextChunks);

      // Phase 1b: AI-directed further expansion
      const evalSystemPrompt = [
        "You evaluate whether a text chunk has enough context for a given search query.",
        "The user provides the search query and the current text.",
        "Respond with EXACTLY one of these words (nothing else):",
        "- LOAD_PREV — if the text starts mid-sentence or is missing important preceding context for the query",
        "- LOAD_NEXT — if the text ends mid-sentence or is missing important following context for the query",
        "- LOAD_BOTH — if both preceding and following context are needed",
        "- READY — if the text has enough context to be meaningful for the query",
      ].join("\n");

      for (let i = 0; i < MAX_EXPAND_ITERATIONS; i++) {
        if (!this.hasPrev && !this.hasNext) break;

        btn.textContent = `⏳ ${t("search.refining")} (${i + 1}/${MAX_EXPAND_ITERATIONS})`;

        const evalPrompt = `Search query: ${this.searchQuery}\n\n---\n\nText:\n${this.textarea.value}`;
        const decision = (await this.llmChat(evalPrompt, evalSystemPrompt)).trim().toUpperCase();

        const needPrev = this.hasPrev && (decision === "LOAD_PREV" || decision === "LOAD_BOTH");
        const needNext = this.hasNext && (decision === "LOAD_NEXT" || decision === "LOAD_BOTH");

        if (!needPrev && !needNext) break;

        if (needPrev) await this.loadChunks("prev", CHUNKS_PER_LOAD);
        if (needNext) await this.loadChunks("next", CHUNKS_PER_LOAD);
      }

      // Phase 2: Refine with LLM (stream into textarea)
      btn.textContent = `⏳ ${t("search.refining")}`;

      const refineSystemPrompt = [
        "You are a text editor. The user provides a search query and raw text extracted from a document.",
        "Your task is to clean up and restructure the text into coherent, well-organized content relevant to the query.",
        "- Remove artifacts from chunking (broken sentences, duplicate text, headers/footers noise)",
        "- Preserve all meaningful information — do not summarize or omit details",
        "- Keep the original language of the content",
        "- Output only the refined text, no explanations",
      ].join("\n");

      const refinePrompt = `Search query: ${this.searchQuery}\n\n---\n\nText:\n${this.textarea.value}`;

      const messages: Message[] = [
        { role: "user", content: refinePrompt, timestamp: Date.now() },
      ];

      let refined = "";
      this.textarea.value = "";

      for await (const chunk of streamChatForModel(
        this.model, messages, refineSystemPrompt, this.settings, this.abortController.signal,
      )) {
        if (chunk.type === "text" && chunk.content) {
          refined += chunk.content;
          this.textarea.value = refined;
        } else if (chunk.type === "error" && chunk.error) {
          throw new Error(chunk.error);
        }
      }

      // Hide prev/next links after successful refine
      this.hideLink("prev");
      this.hideLink("next");
      this.wasRefined = true;
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        new Notice(`Refine failed: ${(e as Error).message}`);
      }
    } finally {
      this.abortController = null;
      btn.addClass("llm-hub-hidden");
      if (this.textarea) this.textarea.disabled = false;
    }
  }
}
