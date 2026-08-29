import type { ToolDefinition } from "../types";
import { formatError } from "../utils/error";
import type { LocalRagSearchResult } from "./localRagStore";

export const RAG_SEARCH_TOOL_NAME = "rag_search";
export const MAX_RAG_SEARCHES_PER_TURN = 3;
export const MAX_DYNAMIC_RAG_RESULTS = 3;

export const RAG_SEARCH_TOOL: ToolDefinition = {
  name: RAG_SEARCH_TOOL_NAME,
  description: "Search the selected RAG index with a focused semantic query. Use this when the automatically retrieved context is missing, too broad, or suggests a better follow-up query. Searches only the configured RAG index; it does not scan the vault directly.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Focused semantic search query. Rephrase or narrow the user's request instead of repeating it unchanged.",
      },
    },
    required: ["query"],
  },
};

/**
 * Appended to the system prompt whenever the tool is offered. The automatic
 * retrieval embeds the user's message verbatim, which is a weak query for
 * follow-ups; saying so is what makes a model reach for the tool at all.
 */
export const RAG_SEARCH_SYSTEM_PROMPT = `\n\nThe selected RAG index is also available through the ${RAG_SEARCH_TOOL_NAME} tool. The automatic search that produced the vault context above used the user's message verbatim as the query. That is a weak query for a follow-up question, for a pronoun-heavy request, or when the answer needs a term the user did not write, so the context above is a starting point rather than a complete retrieval. Whenever it looks off-topic, thin, or answers a broader question than the one asked, call ${RAG_SEARCH_TOOL_NAME} with a self-contained, rephrased query instead of answering from it. At most ${MAX_RAG_SEARCHES_PER_TURN} RAG searches are allowed per turn including the automatic one; each additional search returns at most ${MAX_DYNAMIC_RAG_RESULTS} chunks.`;

export interface RagSearchRunner {
  /** Record the automatic retrieval that already consumed part of the turn budget. */
  countAutomaticSearch(): void;
  /** Execute one rag_search tool call. */
  run(args: Record<string, unknown>): Promise<unknown>;
}

/**
 * Per-turn state for the rag_search tool: a search budget shared with the
 * automatic retrieval, and the sources the model pulled in on its own.
 */
export function createRagSearchRunner(
  search: (query: string, topK: number) => Promise<LocalRagSearchResult[]>,
  /** Called with the file paths a tool-driven search surfaced, so the reply can cite them. */
  onSources?: (filePaths: string[]) => void,
): RagSearchRunner {
  let searchCount = 0;

  return {
    countAutomaticSearch() {
      searchCount++;
    },
    async run(args: Record<string, unknown>) {
      if (searchCount >= MAX_RAG_SEARCHES_PER_TURN) {
        return { error: `RAG search limit reached (${MAX_RAG_SEARCHES_PER_TURN} searches per turn, including the automatic retrieval).` };
      }
      const query = typeof args.query === "string" ? args.query.trim() : "";
      if (!query) return { error: "A non-empty query is required." };

      let results: LocalRagSearchResult[];
      try {
        results = await search(query, MAX_DYNAMIC_RAG_RESULTS);
      } catch (e) {
        // Not counted against the budget: the index was never reached.
        return { error: `RAG search failed: ${formatError(e)}` };
      }
      searchCount++;
      if (results.length > 0) onSources?.([...new Set(results.map(result => result.filePath))]);

      return {
        query,
        results: results.map(result => ({
          filePath: result.filePath,
          ...(result.pageLabel ? { pageLabel: result.pageLabel } : {}),
          score: result.score,
          text: result.text,
        })),
        remainingSearches: MAX_RAG_SEARCHES_PER_TURN - searchCount,
      };
    },
  };
}
