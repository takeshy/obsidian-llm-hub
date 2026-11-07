import { MarkdownView, type App } from "obsidian";
import { isFileAllowedForVaultTools } from "obsidian-llm-hub-common/core";
import { createToolExecutor } from "src/vault/toolExecutor";
import type { LlmHubSettings, Message, RagSetting } from "src/types";
import { searchLocalRagResults } from "../localRagStore";
import { liveToolDefinitions, type LiveFileAccess, type LiveToolCall } from "./live-tool-definitions";
import { getLiveProviders, type LiveTranscript } from "./live-session";

export interface LiveRagSelection { name: string; setting: RagSetting }

/** Embedding credentials belong to the index, independently of the voice provider. */
export function getLiveRagApiKey(setting: RagSetting, settings: LlmHubSettings): string {
  if (setting.embeddingApiKey.trim()) return setting.embeddingApiKey.trim();
  if (setting.embeddingBaseUrl.trim()) {
    try {
      if (new URL(setting.embeddingBaseUrl).origin !== "https://generativelanguage.googleapis.com") return "";
    } catch { return ""; }
  }
  const gemini = getLiveProviders(settings.apiProviders).filter(provider => provider.type === "gemini");
  return (gemini.find(provider => provider.enabled) ?? gemini[0])?.apiKey.trim() ?? "";
}

function ragErrorMessage(error: unknown, setting: RagSetting, settings: LlmHubSettings): string {
  let message = error instanceof Error ? error.message : String(error);
  for (const key of [setting.embeddingApiKey, settings.jevApiKey, ...settings.apiProviders.map(provider => provider.apiKey)]) {
    if (key) message = message.split(key).join("[redacted]");
  }
  return message.slice(0, 1000);
}

/** Dedicated read-only runner: never route Live calls to the unrestricted chat executor. */
export function createLiveVaultToolRunner(app: App, settings: LlmHubSettings, access: LiveFileAccess, rag?: LiveRagSelection) {
  const allowed = new Set(liveToolDefinitions(access).map(tool => tool.name));
  const maxChars = Math.max(1, Math.min(settings.maxNoteChars || 40_000, 40_000));
  const execute = createToolExecutor(app, {
    limitVaultToolScope: true, vaultToolAllowedFolders: [...settings.cloudVaultToolAllowedFolders],
    listNotesLimit: Math.max(1, Math.min(settings.listNotesLimit || 50, 50)), maxNoteChars: maxChars,
    pdfInputMode: "extract-text",
  });
  return async (call: LiveToolCall, signal: AbortSignal): Promise<unknown> => {
    signal.throwIfAborted();
    if (!allowed.has(call.name)) return { error: "This tool is unavailable in Live." };
    let result: unknown;
    let resultCount: number | undefined;
    if (call.name === "read_current_file") {
      const view = app.workspace.getMostRecentLeaf()?.view;
      const file = view instanceof MarkdownView ? view.file : app.workspace.getActiveFile();
      if (!file) return { error: "No file is open in the editor." };
      if (!isFileAllowedForVaultTools(file, settings.cloudVaultToolAllowedFolders)) return { error: "Access denied: the current file is outside the allowed vault folders." };
      if (view instanceof MarkdownView) {
        const content = view.editor.getValue();
        result = { filePath: file.path, content: content.slice(0, maxChars), truncated: content.length > maxChars, unsavedEditorText: true };
      } else result = await execute("read_note", { fileName: file.path });
    } else if (call.name === "rag_search") {
      if (!rag || !access.ragEnabled) return { error: "No RAG index is selected." };
      const query = typeof call.args.query === "string" ? call.args.query.trim() : "";
      if (!query) return { error: "A non-empty query is required." };
      const apiKey = getLiveRagApiKey(rag.setting, settings);
      if (!apiKey && !rag.setting.embeddingBaseUrl.trim()) {
        return { error: "Gemini embeddings require a Gemini API key on this device. Set the RAG embedding API key or register a Gemini provider key. The OpenAI Live key is separate." };
      }
      try {
        const results = await searchLocalRagResults(rag.name, query, rag.setting, apiKey, settings.proxyUrl, settings.proxyBypass, rag.setting.topK, settings);
        resultCount = results.length;
        result = { query, resultCount, results: results.map(item => ({ filePath: item.filePath, text: item.text, score: item.score, pageLabel: item.pageLabel })) };
      } catch (error) {
        signal.throwIfAborted();
        return { error: ragErrorMessage(error, rag.setting, settings) };
      }
    } else result = await execute(call.name, call.args);
    signal.throwIfAborted();
    const json = JSON.stringify(result);
    return json && json.length > 40_000 ? { ...(resultCount !== undefined ? { resultCount } : {}), truncated: true, resultText: json.slice(0, 40_000) } : result;
  };
}

export function liveTranscriptMessages(transcript: LiveTranscript[], now = Date.now()): Message[] {
  return transcript.filter(item => item.text.trim()).map((item, index) => ({ role: item.role, content: item.text, timestamp: now + index }));
}
