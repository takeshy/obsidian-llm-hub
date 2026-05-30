import { useState, useEffect, useRef, useCallback } from "react";
import Search from "lucide-react/dist/esm/icons/search";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import MessagesSquare from "lucide-react/dist/esm/icons/messages-square";
import FileText from "lucide-react/dist/esm/icons/file-text";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Settings2 from "lucide-react/dist/esm/icons/settings-2";
import CircleHelp from "lucide-react/dist/esm/icons/circle-help";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Plus from "lucide-react/dist/esm/icons/plus";
import Undo2 from "lucide-react/dist/esm/icons/undo-2";
import X from "lucide-react/dist/esm/icons/x";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { Modal, Notice, Platform } from "obsidian";
import { RagChunkEditModal } from "./RagChunkEditModal";
import type { LlmHubPlugin } from "src/plugin";
import type { Attachment, ModelType, ModelInfo, Message } from "src/types";
import { getGeminiApiKey, DEFAULT_GEMINI_EMBEDDING_MODEL, DEFAULT_RAG_SETTING, CLI_MODEL, CLAUDE_CLI_MODEL, CODEX_CLI_MODEL, localLlmDisplayName } from "src/types";
import { TFile } from "obsidian";
import { getLocalRagStore, extractPdfPages, loadRagMediaAttachments, type LocalRagSearchResult, type RagMediaReference } from "src/core/localRagStore";
import { extractPdfText } from "src/vault/search";
import { extensionToMimeType } from "src/core/embeddingProvider";
import { streamChatForModel } from "src/core/discussionEngine";
import { parseFilterTerms, matchesFilter, removeRedundantTerms } from "./searchUtils";
import { t } from "src/i18n";

class SearchHelpModal extends Modal {
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: t("search.helpTitle") });
    const helpKeys = [
      "search.helpTopK",
      "search.helpScoreThreshold",
      "search.helpExt",
      "search.helpChunkSize",
      "search.helpChunkOverlap",
      "search.helpPdfChunkPages",
    ] as const;
    const list = contentEl.createEl("ul");
    for (const key of helpKeys) {
      list.createEl("li", { text: t(key) });
    }
  }
  onClose() {
    this.contentEl.empty();
  }
}

interface SearchPanelProps {
  plugin: LlmHubPlugin;
  onChatWithResults: (attachments: Attachment[]) => void;
  onDiscussionWithResults?: (attachments: Attachment[]) => void;
}

function getAvailableModels(plugin: LlmHubPlugin): ModelInfo[] {
  const cliConfig = plugin.settings.cliConfig;
  const enabledApiProviders = !Platform.isMobile ? plugin.settings.apiProviders.filter(p => p.enabled && p.verified) : [];
  return [
    ...enabledApiProviders.flatMap(p =>
      p.enabledModels.map(m => ({
        name: `api:${p.id}:${m}` as ModelType,
        displayName: `${p.name} (${m})`,
        description: `${p.type} API provider`,
        isCliModel: false,
        providerName: p.name,
      }))
    ),
    ...(!Platform.isMobile && cliConfig.cliVerified ? [CLI_MODEL] : []),
    ...(!Platform.isMobile && cliConfig.claudeCliVerified ? [CLAUDE_CLI_MODEL] : []),
    ...(!Platform.isMobile && cliConfig.codexCliVerified ? [CODEX_CLI_MODEL] : []),
    ...(!Platform.isMobile
      ? (plugin.settings.localLlmConfigs ?? [])
          .filter(c => c.verified && c.enabled !== false)
          .flatMap(c => {
            const models = (c.enabledModels && c.enabledModels.length > 0)
              ? c.enabledModels
              : (c.model ? [c.model] : []);
            return models.map(m => ({
              name: `local-llm:${c.id}:${m}` as ModelType,
              displayName: localLlmDisplayName(c, m),
              description: `Local LLM (${c.framework})`,
              isCliModel: true,
            }));
          })
      : []),
  ];
}

export default function SearchPanel({ plugin, onChatWithResults, onDiscussionWithResults }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [ragSettingNames, setRagSettingNames] = useState<string[]>(plugin.getRagSettingNames());
  const [selectedRagSetting, setSelectedRagSetting] = useState<string>(
    plugin.workspaceState.selectedRagSetting ?? ragSettingNames[0] ?? ""
  );
  const [results, setResults] = useState<LocalRagSearchResult[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
  const [mediaPreviews, setMediaPreviews] = useState<Map<number, string>>(new Map());
  const mediaPreviewsRef = useRef(mediaPreviews);
  mediaPreviewsRef.current = mediaPreviews;
  const [pdfModes, setPdfModes] = useState<Map<number, "text" | "pdf">>(new Map());
  const filterIdCounter = useRef(1);
  const [keywordFilters, setKeywordFilters] = useState<{ id: number; value: string }[]>(
    () => [{ id: 0, value: "" }]
  );
  const [aiSuggestingId, setAiSuggestingId] = useState<number | null>(null);
  const [aiPrevValues, setAiPrevValues] = useState<Map<number, string>>(new Map());
  const aiAbortRef = useRef<AbortController | null>(null);
  const [editedIndices, setEditedIndices] = useState<Set<number>>(new Set());
  const pdfTextExtractedRef = useRef<Set<number>>(new Set());
  const pdfOriginalTexts = useRef<Map<number, string>>(new Map());
  const [refinedIndices, setRefinedIndices] = useState<Set<number>>(new Set());
  const [chunkBoundaries, setChunkBoundaries] = useState<Map<number, { first: string; last: string }>>(new Map());
  const [refineModel, setRefineModel] = useState<ModelType | "">(plugin.workspaceState.selectedModel || "");
  const availableModels = getAvailableModels(plugin);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [topK, setTopK] = useState(() => {
    const setting = plugin.getRagSetting(
      plugin.workspaceState.selectedRagSetting ?? ragSettingNames[0] ?? ""
    );
    return setting?.topK ?? DEFAULT_RAG_SETTING.topK;
  });
  const [scoreThreshold, setScoreThreshold] = useState(() => {
    const setting = plugin.getRagSetting(
      plugin.workspaceState.selectedRagSetting ?? ragSettingNames[0] ?? ""
    );
    return setting?.scoreThreshold ?? DEFAULT_RAG_SETTING.scoreThreshold;
  });

  // RAG settings section state
  const [showRagConfig, setShowRagConfig] = useState(false);
  const [chunkSize, setChunkSize] = useState(() => {
    const setting = plugin.getRagSetting(
      plugin.workspaceState.selectedRagSetting ?? ragSettingNames[0] ?? ""
    );
    return setting?.chunkSize ?? DEFAULT_RAG_SETTING.chunkSize;
  });
  const [chunkOverlap, setChunkOverlap] = useState(() => {
    const setting = plugin.getRagSetting(
      plugin.workspaceState.selectedRagSetting ?? ragSettingNames[0] ?? ""
    );
    return setting?.chunkOverlap ?? DEFAULT_RAG_SETTING.chunkOverlap;
  });
  const [pdfChunkPages, setPdfChunkPages] = useState(() => {
    const setting = plugin.getRagSetting(
      plugin.workspaceState.selectedRagSetting ?? ragSettingNames[0] ?? ""
    );
    return setting?.pdfChunkPages ?? DEFAULT_RAG_SETTING.pdfChunkPages;
  });
  const [targetFolders, setTargetFolders] = useState(() => {
    const setting = plugin.getRagSetting(
      plugin.workspaceState.selectedRagSetting ?? ragSettingNames[0] ?? ""
    );
    return setting?.targetFolders?.join(", ") ?? "";
  });
  const [excludePatterns, setExcludePatterns] = useState(() => {
    const setting = plugin.getRagSetting(
      plugin.workspaceState.selectedRagSetting ?? ragSettingNames[0] ?? ""
    );
    return setting?.excludePatterns?.join("\n") ?? "";
  });
  const [searchFileExtensions, setSearchFileExtensions] = useState(() => {
    const setting = plugin.getRagSetting(
      plugin.workspaceState.selectedRagSetting ?? ragSettingNames[0] ?? ""
    );
    return (setting?.searchFileExtensions ?? []).join(", ");
  });
  const [ragSyncing, setRagSyncing] = useState(false);
  const [ragSyncProgress, setRagSyncProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const ragSyncCancelRef = useRef(false);
  const [indexedFiles, setIndexedFiles] = useState<{ filePath: string; chunks: number }[]>([]);
  const [showIndexedFiles, setShowIndexedFiles] = useState(false);

  // Check if current setting is internal (not external index)
  const currentRagSetting = plugin.getRagSetting(selectedRagSetting);
  const isInternalRag = currentRagSetting
    ? !currentRagSetting.externalIndexPath && currentRagSetting.sourceRagSettings.length === 0
    : false;

  // Revoke PDF blob URLs and abort AI suggestions on unmount
  useEffect(() => {
    return () => {
      mediaPreviewsRef.current.forEach(url => URL.revokeObjectURL(url));
      aiAbortRef.current?.abort();
    };
  }, []);

  // Keep the search panel in sync with workspace state and RAG setting changes.
  useEffect(() => {
    const syncRagSettings = () => {
      const names = plugin.getRagSettingNames();
      setRagSettingNames(names);
      setSelectedRagSetting(prev => {
        const workspaceSelection = plugin.workspaceState.selectedRagSetting;
        if (workspaceSelection && names.includes(workspaceSelection)) return workspaceSelection;
        if (prev && names.includes(prev)) return prev;
        return names[0] ?? "";
      });
    };

    syncRagSettings();
    plugin.settingsEmitter.on("workspace-state-loaded", syncRagSettings);
    plugin.settingsEmitter.on("rag-setting-changed", syncRagSettings);

    return () => {
      plugin.settingsEmitter.off("workspace-state-loaded", syncRagSettings);
      plugin.settingsEmitter.off("rag-setting-changed", syncRagSettings);
    };
  }, [plugin]);

  useEffect(() => {
    const setting = plugin.getRagSetting(selectedRagSetting);
    setTopK(setting?.topK ?? DEFAULT_RAG_SETTING.topK);
    setScoreThreshold(setting?.scoreThreshold ?? DEFAULT_RAG_SETTING.scoreThreshold);
    setChunkSize(setting?.chunkSize ?? DEFAULT_RAG_SETTING.chunkSize);
    setChunkOverlap(setting?.chunkOverlap ?? DEFAULT_RAG_SETTING.chunkOverlap);
    setPdfChunkPages(setting?.pdfChunkPages ?? DEFAULT_RAG_SETTING.pdfChunkPages);
    setTargetFolders(setting?.targetFolders?.join(", ") ?? "");
    setExcludePatterns(setting?.excludePatterns?.join("\n") ?? "");
    setSearchFileExtensions((setting?.searchFileExtensions ?? []).join(", "));
  }, [plugin, selectedRagSetting]);

  // Load defaults from RAG setting when selection changes
  const handleRagSettingChange = (name: string) => {
    setSelectedRagSetting(name);
    const setting = plugin.getRagSetting(name);
    if (setting) {
      setTopK(setting.topK);
      setScoreThreshold(setting.scoreThreshold);
      setChunkSize(setting.chunkSize);
      setChunkOverlap(setting.chunkOverlap);
      setPdfChunkPages(setting.pdfChunkPages ?? DEFAULT_RAG_SETTING.pdfChunkPages);
      setTargetFolders(setting.targetFolders?.join(", ") ?? "");
      setExcludePatterns(setting.excludePatterns?.join("\n") ?? "");
      setSearchFileExtensions((setting.searchFileExtensions ?? []).join(", "));
    }
  };

  // Handle RAG config field updates
  const handleChunkSizeChange = useCallback((value: number) => {
    setChunkSize(value);
    if (selectedRagSetting) {
      void plugin.updateRagSetting(selectedRagSetting, { chunkSize: value });
    }
  }, [plugin, selectedRagSetting]);

  const handleChunkOverlapChange = useCallback((value: number) => {
    setChunkOverlap(value);
    if (selectedRagSetting) {
      void plugin.updateRagSetting(selectedRagSetting, { chunkOverlap: value });
    }
  }, [plugin, selectedRagSetting]);

  const handlePdfChunkPagesChange = useCallback((value: number) => {
    setPdfChunkPages(value);
    if (selectedRagSetting) {
      void plugin.updateRagSetting(selectedRagSetting, { pdfChunkPages: value });
    }
  }, [plugin, selectedRagSetting]);

  const handleTargetFoldersChange = useCallback((value: string) => {
    setTargetFolders(value);
    if (selectedRagSetting) {
      const folders = value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      void plugin.updateRagSetting(selectedRagSetting, { targetFolders: folders });
    }
  }, [plugin, selectedRagSetting]);

  const handleExcludePatternsChange = useCallback((value: string) => {
    setExcludePatterns(value);
    if (selectedRagSetting) {
      const patterns = value
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      void plugin.updateRagSetting(selectedRagSetting, { excludePatterns: patterns });
    }
  }, [plugin, selectedRagSetting]);

  // Load indexed files list
  const loadIndexedFiles = useCallback(async () => {
    const store = getLocalRagStore();
    if (!store || !selectedRagSetting) {
      setIndexedFiles([]);
      return;
    }
    const files = await store.getIndexedFiles(plugin.app, selectedRagSetting);
    setIndexedFiles(files);
  }, [plugin, selectedRagSetting]);

  // Load indexed files when config section is opened
  useEffect(() => {
    if (showRagConfig) {
      void loadIndexedFiles();
    }
  }, [showRagConfig, loadIndexedFiles]);

  // Handle RAG sync
  const handleRagSync = useCallback(async () => {
    if (ragSyncing) {
      ragSyncCancelRef.current = true;
      return;
    }
    if (!selectedRagSetting) return;

    setRagSyncing(true);
    setRagSyncProgress(null);
    ragSyncCancelRef.current = false;

    try {
      const result = await plugin.syncVaultForLocalRAG(selectedRagSetting, (current, total, fileName) => {
        if (ragSyncCancelRef.current) {
          throw new Error("Cancelled by user");
        }
        setRagSyncProgress({ current, total, fileName });
      });
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
        // Reload indexed files list after sync
        void loadIndexedFiles();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg !== "Cancelled by user") {
        new Notice(t("settings.syncFailed", { error: msg }));
      } else {
        new Notice(t("settings.syncCancelled"));
      }
    } finally {
      setRagSyncing(false);
      setRagSyncProgress(null);
      ragSyncCancelRef.current = false;
    }
  }, [plugin, selectedRagSetting, ragSyncing, loadIndexedFiles]);

  const handleSearch = async () => {
    if (isSearching) {
      return;
    }
    if (!selectedRagSetting) {
      new Notice(t("search.noRagSetting"));
      return;
    }
    if (!query.trim()) {
      new Notice(t("search.enterQuery"));
      return;
    }

    const ragSetting = plugin.getRagSearchSetting(selectedRagSetting);
    if (!ragSetting) {
      new Notice(t("search.ragSettingNotFound"));
      return;
    }

    const store = getLocalRagStore();
    if (!store) {
      new Notice(t("search.searchFailed"));
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    setSelectedIndices(new Set());
    setExpandedIndices(new Set());
    mediaPreviews.forEach(url => URL.revokeObjectURL(url));
    setMediaPreviews(new Map());
    setPdfModes(new Map());
    aiAbortRef.current?.abort();
    setKeywordFilters([{ id: filterIdCounter.current++, value: "" }]);
    setAiPrevValues(new Map());
    setEditedIndices(new Set());
    setRefinedIndices(new Set());
    setChunkBoundaries(new Map());
    pdfTextExtractedRef.current = new Set();
    pdfOriginalTexts.current = new Map();

    try {
      const apiKey = ragSetting.embeddingApiKey || getGeminiApiKey(plugin.settings);
      const searchResults = await store.search(
        selectedRagSetting,
        query.trim(),
        apiKey,
        ragSetting.embeddingModel || (ragSetting.embeddingBaseUrl ? "" : DEFAULT_GEMINI_EMBEDDING_MODEL),
        topK,
        ragSetting.embeddingBaseUrl || undefined,
        scoreThreshold,
        searchFileExtensions.split(",").map(s => s.trim()).filter(s => s.length > 0)
      );
      setResults(searchResults);
    } catch (err) {
      new Notice(t("search.searchFailed") + ": " + (err instanceof Error ? err.message : String(err)));
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const loadMediaPreview = (index: number, result: LocalRagSearchResult) => {
    if (!result.contentType || result.contentType === "text" || mediaPreviews.has(index)) {
      return;
    }

    void (async () => {
      try {
        if (result.contentType === "pdf" && result.pageLabel) {
          // PDF: extract chunk pages
          const att = await extractPdfPages(plugin.app, result.filePath, result.pageLabel);
          if (att) {
            const bytes = Uint8Array.from(atob(att.data), c => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: "application/pdf" });
            setMediaPreviews(prev => new Map(prev).set(index, URL.createObjectURL(blob)));
          }
        } else {
          // Image, audio, video: load file directly
          const isAbsolute = result.filePath.startsWith("/") || /^[A-Z]:\\/i.test(result.filePath);
          let bytes: Uint8Array;
          let ext: string;
          if (isAbsolute) {
            const fs = (globalThis as { require?: (id: string) => { promises: { readFile: (p: string) => Promise<Buffer> } } }).require?.("fs");
            const nodePath = (globalThis as { require?: (id: string) => { extname: (p: string) => string } }).require?.("path");
            if (!fs || !nodePath) return;
            const buffer = await fs.promises.readFile(result.filePath);
            bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            ext = nodePath.extname(result.filePath).slice(1);
          } else {
            const file = plugin.app.vault.getAbstractFileByPath(result.filePath);
            if (!(file instanceof TFile)) return;
            const buffer = await plugin.app.vault.readBinary(file);
            bytes = new Uint8Array(buffer);
            ext = file.extension;
          }
          const mimeType = extensionToMimeType(ext);
          if (!mimeType) return;
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
          setMediaPreviews(prev => new Map(prev).set(index, URL.createObjectURL(blob)));
        }
      } catch {
        // Preview load failed
      }
    })();
  };

  // Extract actual text for PDF results whose text is just a metadata label.
  // This enables keyword filtering, text preview, and editing on the real content.
  useEffect(() => {
    let cancelled = false;
    const extract = async () => {
      for (let i = 0; i < results.length; i++) {
        if (cancelled) break;
        const result = results[i];
        if (result.contentType !== "pdf") continue;
        if (pdfTextExtractedRef.current.has(i)) continue;
        if (!/^\[Pdf:/i.test(result.text)) continue;

        pdfOriginalTexts.current.set(i, result.text);
        const pageMatch = result.pageLabel?.match(/pages?\s+(\d+)\s*-\s*(\d+)/i);
        const startPage = pageMatch ? parseInt(pageMatch[1], 10) : undefined;
        const endPage = pageMatch ? parseInt(pageMatch[2], 10) : undefined;
        const extracted = await extractPdfText(plugin.app, result.filePath, startPage, endPage);
        if (cancelled) break;
        pdfTextExtractedRef.current.add(i);
        if (extracted) {
          setResults(prev => {
            const next = [...prev];
            next[i] = { ...prev[i], text: extracted };
            return next;
          });
        }
      }
    };
    void extract();
    return () => { cancelled = true; };
  }, [results]);

  const toggleExpanded = (index: number) => {
    const result = results[index];
    const isExpanding = !expandedIndices.has(index);

    setExpandedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });

    // Load media preview on first expand
    if (isExpanding && result) {
      loadMediaPreview(index, result);
    }
  };

  const toggleSelection = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Filtered results: pairs of [originalIndex, result] matching the keyword filters.
  // Each field: space-separated OR (any term matches), quoted phrases match as-is. Between fields: AND.
  const filteredResults: [number, LocalRagSearchResult][] = (() => {
    const activeFilters = keywordFilters
      .map(f => parseFilterTerms(f.value))
      .filter(terms => terms.length > 0);
    if (activeFilters.length === 0) return results.map((r, i) => [i, r] as [number, LocalRagSearchResult]);
    return results
      .map((r, i) => [i, r] as [number, LocalRagSearchResult])
      .filter(([, r]) => {
        const rawText = r.text + " " + r.filePath;
        return activeFilters.every(terms => matchesFilter(rawText, terms));
      });
  })();

  const toggleSelectAll = () => {
    const filteredIndices = new Set(filteredResults.map(([i]) => i));
    const allFilteredSelected = filteredResults.length > 0 && filteredResults.every(([i]) => selectedIndices.has(i));
    if (allFilteredSelected) {
      setSelectedIndices(prev => {
        const next = new Set(prev);
        for (const i of filteredIndices) next.delete(i);
        return next;
      });
    } else {
      setSelectedIndices(prev => new Set([...prev, ...filteredIndices]));
    }
  };

  const buildSelectedAttachments = async (): Promise<Attachment[] | null> => {
    if (selectedIndices.size === 0) {
      new Notice(t("search.selectResults"));
      return null;
    }

    const textAttachments: Attachment[] = [];
    const mediaReferences: RagMediaReference[] = [];

    for (const idx of Array.from(selectedIndices).sort((a, b) => a - b)) {
      const result = results[idx];
      if (!result) continue;

      // Non-text content → attach as media file
      // For PDFs, respect per-result pdfModes choice (default: "text" to try extraction)
      const pdfMode = result.contentType === "pdf" ? (pdfModes.get(idx) ?? "text") : undefined;
      if (result.contentType && result.contentType !== "text" && pdfMode !== "text") {
        mediaReferences.push({
          filePath: result.filePath,
          contentType: result.contentType,
          pageLabel: result.pageLabel,
        });
        continue;
      }

      // For PDF in text mode, extract text using PDF.js
      // If the user has already edited the text, honour their edits
      let textContent: string;
      if (result.contentType === "pdf" && pdfMode === "text" && !editedIndices.has(idx)) {
        // Parse page range from pageLabel (e.g. "pages 1-6 of 24")
        const pageMatch = result.pageLabel?.match(/pages?\s+(\d+)\s*-\s*(\d+)/i);
        const startPage = pageMatch ? parseInt(pageMatch[1], 10) : undefined;
        const endPage = pageMatch ? parseInt(pageMatch[2], 10) : undefined;
        const extracted = await extractPdfText(plugin.app, result.filePath, startPage, endPage);
        if (!extracted) {
          // No extractable text → fall back to media attachment
          mediaReferences.push({
            filePath: result.filePath,
            contentType: result.contentType,
            pageLabel: result.pageLabel,
          });
          continue;
        }
        textContent = extracted;
      } else {
        textContent = result.text;
      }

      // Text content (or PDF with extracted text) → attach as editable text
      const content = `[Source: ${result.filePath}] (relevance: ${result.score.toFixed(3)})\n\n${textContent}`;
      const fileName = result.filePath.split("/").pop() || result.filePath;
      const nameWithChunk = result.chunkIndex > 0
        ? `${fileName} (chunk ${result.chunkIndex})`
        : fileName;
      textAttachments.push({
        name: nameWithChunk,
        type: "text",
        mimeType: "text/plain",
        data: btoa(unescape(encodeURIComponent(content))),
        sourcePath: result.filePath,
        pageLabel: result.pageLabel,
      });
    }

    try {
      const mediaAttachments = mediaReferences.length > 0
        ? await loadRagMediaAttachments(plugin.app, mediaReferences)
        : [];
      return [...textAttachments, ...mediaAttachments];
    } catch (err) {
      new Notice(t("search.searchFailed") + ": " + (err instanceof Error ? err.message : String(err)));
      return null;
    }
  };

  const handleChatWithSelected = async () => {
    const attachments = await buildSelectedAttachments();
    if (attachments) onChatWithResults(attachments);
  };

  const handleDiscussionWithSelected = async () => {
    const attachments = await buildSelectedAttachments();
    if (attachments) onDiscussionWithResults?.(attachments);
  };

  const handleAiSuggest = async (filterId: number) => {
    const filter = keywordFilters.find(f => f.id === filterId);
    const currentTerms = filter?.value.trim();
    if (!currentTerms || !refineModel) return;

    // Abort any previous AI suggestion
    aiAbortRef.current?.abort();
    const abortController = new AbortController();
    aiAbortRef.current = abortController;

    // Save current value for undo
    setAiPrevValues(prev => new Map(prev).set(filterId, currentTerms));
    setAiSuggestingId(filterId);
    try {
      const systemPrompt = [
        "You are a keyword expansion assistant.",
        "Given the user's search keywords, suggest additional synonyms, related terms, and alternate phrasings that would help find similar content.",
        "Return ONLY a space-separated list of suggested keywords (no numbering, no explanations, no punctuation except hyphens within compound words).",
        "Include the original keywords in your response.",
        "If the input is not in English, also include English translations and related English terms.",
        "Keep the total number of terms between 5 and 15.",
      ].join(" ");
      const messages: Message[] = [{ role: "user", content: currentTerms, timestamp: Date.now() }];
      let result = "";
      for await (const chunk of streamChatForModel(
        refineModel,
        messages,
        systemPrompt,
        plugin.settings,
        abortController.signal,
      )) {
        if (abortController.signal.aborted) return;
        if (chunk.type === "error") {
          throw new Error(chunk.error ?? chunk.content ?? "Unknown error");
        }
        if (chunk.type === "text" && chunk.content) result += chunk.content;
      }
      const suggested = result.trim();
      if (suggested && !abortController.signal.aborted) {
        const value = removeRedundantTerms(suggested, currentTerms);
        setKeywordFilters(prev => prev.map(f => f.id === filterId ? { ...f, value } : f));
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        new Notice(t("search.aiSuggestFailed") + ": " + (err instanceof Error ? err.message : String(err)));
      }
    } finally {
      if (aiAbortRef.current === abortController) {
        aiAbortRef.current = null;
      }
      setAiSuggestingId(prev => prev === filterId ? null : prev);
    }
  };

  const handleAiUndo = (filterId: number) => {
    const prevValue = aiPrevValues.get(filterId);
    if (prevValue === undefined) return;
    setKeywordFilters(prev => prev.map(f => f.id === filterId ? { ...f, value: prevValue } : f));
    setAiPrevValues(prev => {
      const next = new Map(prev);
      next.delete(filterId);
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSearching) void handleSearch();
    }
  };

  const openPluginSettings = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setting = (plugin.app as any).setting;
    setting?.open?.();
    setting?.openTabById?.(plugin.manifest.id);
  };

  if (ragSettingNames.length === 0) {
    return (
      <div className="llm-hub-search-panel">
        <div className="llm-hub-search-empty-state">
          <p>{t("search.noRagSettings")}</p>
          <p className="llm-hub-search-empty-guide">{t("search.noRagSettingsGuide")}</p>
          <button className="mod-cta" onClick={openPluginSettings}>
            {t("search.openSettings")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="llm-hub-search-panel">
      {/* Search input area */}
      <div className="llm-hub-search-input-area">
        <div className="llm-hub-search-rag-selector">
          <select
            value={selectedRagSetting}
            onChange={e => handleRagSettingChange(e.target.value)}
            className="llm-hub-model-select llm-hub-rag-select"
            disabled={isSearching || ragSyncing}
          >
            {ragSettingNames.map(name => (
              <option key={name} value={name}>
                {t("input.rag", { name })}
              </option>
            ))}
          </select>
          <button
            className="llm-hub-rag-icon-btn"
            onClick={() => setShowRagConfig(!showRagConfig)}
            title={t("input.ragSettings")}
            disabled={ragSyncing}
          >
            <Settings2 size={14} />
          </button>
          <button
            className="llm-hub-rag-icon-btn"
            onClick={() => new SearchHelpModal(plugin.app).open()}
            title={t("search.helpTitle")}
          >
            <CircleHelp size={14} />
          </button>
        </div>
        {showRagConfig && (
          <div className="llm-hub-rag-config-section">
            {isInternalRag && (
              <>
                <div className="llm-hub-rag-config-row">
                  <label>{t("input.ragChunkSize")}: {chunkSize}</label>
                  <input
                    type="range"
                    min={100}
                    max={2000}
                    step={50}
                    value={chunkSize}
                    onChange={e => handleChunkSizeChange(Number(e.target.value))}
                  />
                </div>
                <div className="llm-hub-rag-config-row">
                  <label>{t("input.ragChunkOverlap")}: {chunkOverlap}</label>
                  <input
                    type="range"
                    min={0}
                    max={500}
                    step={10}
                    value={chunkOverlap}
                    onChange={e => handleChunkOverlapChange(Number(e.target.value))}
                  />
                </div>
                <div className="llm-hub-rag-config-row">
                  <label>{t("input.ragPdfChunkPages")}: {pdfChunkPages}</label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={1}
                    value={pdfChunkPages}
                    onChange={e => handlePdfChunkPagesChange(Number(e.target.value))}
                  />
                </div>
                <div className="llm-hub-rag-config-row">
                  <label>{t("input.ragTargetFolders")}</label>
                  <input
                    type="text"
                    className="llm-hub-rag-config-input"
                    placeholder={t("input.ragTargetFolders.placeholder")}
                    value={targetFolders}
                    onChange={e => handleTargetFoldersChange(e.target.value)}
                  />
                </div>
                <div className="llm-hub-rag-config-row">
                  <label>{t("input.ragExcludedPatterns")}</label>
                  <textarea
                    className="llm-hub-rag-config-textarea"
                    placeholder={t("input.ragExcludedPatterns.placeholder")}
                    value={excludePatterns}
                    rows={3}
                    onChange={e => handleExcludePatternsChange(e.target.value)}
                  />
                </div>
              </>
            )}
            {/* Last sync timestamp */}
            {currentRagSetting?.lastFullSync && (
              <div className="llm-hub-rag-last-sync">
                {t("input.ragLastSync")}: {new Date(currentRagSetting.lastFullSync).toLocaleString()}
              </div>
            )}
            {/* Indexed files accordion */}
            <div className="llm-hub-rag-indexed-files">
              <button
                className="llm-hub-rag-indexed-files-toggle"
                onClick={() => setShowIndexedFiles(!showIndexedFiles)}
              >
                <ChevronDown size={12} className={showIndexedFiles ? "llm-hub-chevron-rotated" : ""} />
                {t("input.ragIndexedFiles", { count: String(indexedFiles.length) })}
              </button>
              {showIndexedFiles && (
                <div className="llm-hub-rag-indexed-files-list">
                  {indexedFiles.length === 0 ? (
                    <div className="llm-hub-rag-indexed-files-empty">{t("input.ragNoIndexedFiles")}</div>
                  ) : (
                    indexedFiles.map(f => (
                      <div key={f.filePath} className="llm-hub-rag-indexed-file-item">
                        <span
                          className="llm-hub-rag-indexed-file-path"
                          onClick={() => {
                            const file = plugin.app.vault.getAbstractFileByPath(f.filePath);
                            if (file) {
                              void plugin.app.workspace.openLinkText(f.filePath, "", false);
                            } else {
                              const { shell } = (globalThis as { require?: (id: string) => { shell: { openPath: (p: string) => void } } }).require?.("electron") ?? {};
                              if (shell) {
                                void shell.openPath(f.filePath);
                              } else {
                                new Notice(f.filePath, 5000);
                              }
                            }
                          }}
                        >
                          {f.filePath}
                        </span>
                        <span className="llm-hub-rag-indexed-file-chunks">
                          {f.chunks} chunks
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {isInternalRag && ragSyncProgress && (
              <div className="llm-hub-rag-sync-progress-bar">
                <progress
                  value={ragSyncProgress.current}
                  max={ragSyncProgress.total}
                />
                <span className="llm-hub-rag-sync-progress-text">
                  {ragSyncProgress.fileName} ({ragSyncProgress.current}/{ragSyncProgress.total})
                </span>
              </div>
            )}
            <div className="llm-hub-rag-config-row">
              <label>{t("search.refineModel")}</label>
              <select
                className="llm-hub-rag-config-select"
                value={refineModel}
                onChange={e => setRefineModel(e.target.value as ModelType | "")}
              >
                <option value="">{t("search.refineModelNone")}</option>
                {availableModels.map(m => (
                  <option key={m.name} value={m.name}>{m.displayName}</option>
                ))}
              </select>
            </div>
            <div className="llm-hub-rag-config-actions">
              {isInternalRag && (
                <button
                  className={`llm-hub-rag-text-btn ${ragSyncing ? "syncing" : ""}`}
                  onClick={() => { void handleRagSync(); }}
                >
                  {ragSyncing ? (
                    <><Loader2 size={12} className="llm-hub-spinner" /> {t("settings.cancelSync")}</>
                  ) : (
                    <><RefreshCw size={12} /> {t("settings.localSyncBtn")}</>
                  )}
                </button>
              )}
              <button
                className="llm-hub-rag-text-btn"
                onClick={() => setShowRagConfig(false)}
              >
                {t("input.close")}
              </button>
            </div>
          </div>
        )}
        <div className="llm-hub-search-params">
          <label className="llm-hub-search-param-label">
            Top K:
            <input
              type="number"
              min={1}
              max={999}
              value={topK}
              onChange={e => setTopK(Math.max(1, Math.min(999, parseInt(e.target.value) || 10)))}
              className="llm-hub-search-param-input"
            />
          </label>
          <label className="llm-hub-search-param-label">
            {t("search.scoreThreshold")}:
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={scoreThreshold}
              onChange={e => setScoreThreshold(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
              className="llm-hub-search-param-input"
            />
          </label>
          <label className="llm-hub-search-param-label">
            Ext.:
            <input
              type="text"
              placeholder={t("settings.searchFileExtensions.placeholder")}
              value={searchFileExtensions}
              onChange={e => setSearchFileExtensions(e.target.value)}
              className="llm-hub-search-param-input"
            />
          </label>
        </div>
        <div className="llm-hub-search-query-row">
          <textarea
            className="llm-hub-search-query-input"
            placeholder={t("search.queryPlaceholder")}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button
            className="llm-hub-search-btn"
            onClick={() => void handleSearch()}
            disabled={isSearching || !selectedRagSetting}
            title={t("search.search")}
          >
            {isSearching ? (
              <Loader2 size={18} className="llm-hub-spinner" />
            ) : (
              <Search size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="llm-hub-search-results">
        {hasSearched && results.length === 0 && !isSearching && (
          <div className="llm-hub-search-no-results">{t("search.noResults")}</div>
        )}
        {results.length > 0 && (
          <>
            <div className="llm-hub-search-results-header">
              <div className="llm-hub-search-keyword-filters">
                {keywordFilters.map((filter) => (
                  <div key={filter.id} className="llm-hub-search-keyword-filter-row">
                    <input
                      className="llm-hub-search-keyword-filter"
                      type="text"
                      placeholder={t("search.keywordFilterOr")}
                      value={filter.value}
                      onChange={e => {
                        const val = e.target.value;
                        setKeywordFilters(prev => prev.map(f => f.id === filter.id ? { ...f, value: val } : f));
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                    {aiPrevValues.has(filter.id) && aiSuggestingId !== filter.id && (
                      <button
                        className="llm-hub-search-keyword-undo-btn"
                        title={t("search.aiUndo")}
                        onClick={() => handleAiUndo(filter.id)}
                      >
                        <Undo2 size={14} />
                      </button>
                    )}
                    <button
                      className="llm-hub-search-keyword-ai-btn"
                      title={t("search.aiSuggest")}
                      disabled={!filter.value.trim() || !refineModel || aiSuggestingId === filter.id}
                      onClick={() => void handleAiSuggest(filter.id)}
                    >
                      {aiSuggestingId === filter.id
                        ? <Loader2 size={14} className="llm-hub-spinner" />
                        : <Sparkles size={14} />}
                    </button>
                    {keywordFilters.length > 1 && (
                      <button
                        className="llm-hub-search-keyword-remove-btn"
                        title={t("search.removeFilter")}
                        onClick={() => {
                          setKeywordFilters(prev => prev.filter(f => f.id !== filter.id));
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="llm-hub-search-keyword-add-btn"
                  title={t("search.addFilter")}
                  onClick={() => setKeywordFilters(prev => [...prev, { id: filterIdCounter.current++, value: "" }])}
                >
                  <Plus size={14} />
                  {t("search.addFilterLabel")}
                </button>
              </div>
              <div className="llm-hub-search-results-actions">
                <label className="llm-hub-search-select-all">
                  <input
                    type="checkbox"
                    checked={filteredResults.length > 0 && filteredResults.every(([i]) => selectedIndices.has(i))}
                    onChange={toggleSelectAll}
                  />
                  {t("search.selectAll")} ({filteredResults.length}/{results.length} {t("search.results")})
                </label>
                <span className="llm-hub-search-selected-count">
                  {t("search.selected")}: {selectedIndices.size}
                </span>
                <button
                  className="llm-hub-search-chat-btn"
                  onClick={() => void handleChatWithSelected()}
                  disabled={selectedIndices.size === 0}
                >
                  <MessageSquare size={14} />
                  Chat
                </button>
                {onDiscussionWithResults && (
                  <button
                    className="llm-hub-search-chat-btn"
                    onClick={() => void handleDiscussionWithSelected()}
                    disabled={selectedIndices.size === 0}
                  >
                    <MessagesSquare size={14} />
                    Discussion
                  </button>
                )}
              </div>
            </div>
            {filteredResults.map(([index, result]) => (
              <div
                key={`${result.filePath}-${result.chunkIndex}`}
                className={`llm-hub-search-result-item ${selectedIndices.has(index) ? "selected" : ""} ${editedIndices.has(index) ? "edited" : ""}`}
                onClick={() => toggleSelection(index)}
              >
                <div className="llm-hub-search-result-header">
                  <input
                    type="checkbox"
                    checked={selectedIndices.has(index)}
                    onChange={() => toggleSelection(index)}
                    onClick={e => e.stopPropagation()}
                  />
                  <FileText size={14} />
                  <span
                    className="llm-hub-search-result-path"
                    onClick={e => {
                      e.stopPropagation();
                      const file = plugin.app.vault.getAbstractFileByPath(result.filePath);
                      if (file) {
                        let linkPath = result.filePath;
                        if (result.contentType === "pdf" && result.pageLabel) {
                          const m = result.pageLabel.match(/^pages\s+(\d+)/);
                          if (m) linkPath += `#page=${m[1]}`;
                        }
                        void plugin.app.workspace.openLinkText(linkPath, "", false);
                      } else {
                        // External RAG: open with OS default app
                        const { shell } = (globalThis as { require?: (id: string) => { shell: { openPath: (p: string) => void } } }).require?.("electron") ?? {};
                        if (shell) {
                          void shell.openPath(result.filePath);
                        } else {
                          new Notice(result.filePath, 5000);
                        }
                      }
                    }}
                    title={t("message.clickToOpen", { source: result.filePath })}
                  >
                    {result.filePath}
                  </span>
                  {result.contentType === "pdf" && result.pageLabel && (
                    <span className="llm-hub-search-result-page-label">{result.pageLabel}</span>
                  )}
                  <span className="llm-hub-search-result-score">
                    {(result.score * 100).toFixed(1)}%
                  </span>
                  {editedIndices.has(index) && (
                    <span className="llm-hub-search-result-edited-badge">{t("search.edited")}</span>
                  )}
                  {result.contentType === "pdf" && (
                    <select
                      className="llm-hub-search-pdf-mode"
                      value={pdfModes.get(index) ?? "text"}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        e.stopPropagation();
                        const mode = e.target.value as "text" | "pdf";
                        setPdfModes(prev => new Map(prev).set(index, mode));
                        if (mode === "pdf" && expandedIndices.has(index)) {
                          loadMediaPreview(index, result);
                        }
                      }}
                    >
                      <option value="text">{t("search.pdfMode.text")}</option>
                      <option value="pdf">{t("search.pdfMode.pdf")}</option>
                    </select>
                  )}
                </div>
                {(() => {
                  const ct = result.contentType;
                  const showMediaPreview = ct === "image" || ct === "audio" || ct === "video"
                    || (ct === "pdf" && (pdfModes.get(index) ?? "text") === "pdf");
                  return showMediaPreview;
                })() ? (
                  <>
                    {expandedIndices.has(index) ? (
                      <div className="llm-hub-search-media-preview" onClick={e => e.stopPropagation()}>
                        {mediaPreviews.has(index) ? (
                          result.contentType === "pdf" ? (
                            <iframe src={mediaPreviews.get(index)} className="llm-hub-search-pdf-iframe" />
                          ) : result.contentType === "image" ? (
                            <img src={mediaPreviews.get(index)} className="llm-hub-search-image-preview" />
                          ) : result.contentType === "audio" ? (
                            <audio src={mediaPreviews.get(index)} controls className="llm-hub-search-audio-preview" />
                          ) : result.contentType === "video" ? (
                            <video src={mediaPreviews.get(index)} controls className="llm-hub-search-video-preview" />
                          ) : null
                        ) : (
                          <Loader2 size={18} className="llm-hub-spinner" />
                        )}
                      </div>
                    ) : null}
                    <button
                      className="llm-hub-search-result-toggle"
                      onClick={e => { e.stopPropagation(); toggleExpanded(index); }}
                    >
                      <ChevronDown size={14} className={expandedIndices.has(index) ? "llm-hub-chevron-rotated" : ""} />
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className={`llm-hub-search-result-preview ${expandedIndices.has(index) ? "expanded" : ""}`}
                      onClick={e => { e.stopPropagation(); toggleExpanded(index); }}
                    >
                      {expandedIndices.has(index) ? result.text : (
                        result.text.length > 300 ? result.text.slice(0, 300) + "..." : result.text
                      )}
                    </div>
                    <div className="llm-hub-search-result-actions">
                      {expandedIndices.has(index) && (
                        <button
                          className="llm-hub-search-result-edit-btn clickable-icon"
                          onClick={e => {
                            e.stopPropagation();
                            const origText = pdfOriginalTexts.current.get(index);
                            const boundary = chunkBoundaries.get(index)
                              ?? (origText ? { first: origText, last: origText } : undefined);
                            new RagChunkEditModal(plugin.app, result, selectedRagSetting, query, plugin.settings, refineModel as ModelType, refinedIndices.has(index), (edited) => {
                              setResults(prev => {
                                const next = [...prev];
                                next[index] = { ...prev[index], text: edited.text };
                                return next;
                              });
                              setEditedIndices(prev => new Set(prev).add(index));
                              setChunkBoundaries(prev => new Map(prev).set(index, { first: edited.firstChunkText, last: edited.lastChunkText }));
                              if (edited.refined) {
                                setRefinedIndices(prev => new Set(prev).add(index));
                              }
                            }, boundary).open();
                          }}
                          title={t("search.editChunk")}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {result.text.length > 300 && (
                        <button
                          className="llm-hub-search-result-toggle"
                          onClick={e => { e.stopPropagation(); toggleExpanded(index); }}
                        >
                          <ChevronDown size={14} className={expandedIndices.has(index) ? "llm-hub-chevron-rotated" : ""} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
