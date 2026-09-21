import type { ApiProviderConfig } from "../types";
import type { LocalRagSearchResult } from "./localRagStore";
import { createNodeFetch, createProxyFetch } from "./proxyFetch";

export const OPENROUTER_DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
export const JEV_MODEL = "~typesafe/jev-latest";
export const TYPESAFE_DECISIONS_URL = "https://jevtypesafeai.com/api/v1/decide";
export const TYPESAFE_JEV_MODEL = "jev-latest";

type JevFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function getOpenRouterApiKey(providers: ApiProviderConfig[]): string {
  return providers.find(provider => provider.type === "openrouter" && provider.apiKey.trim())?.apiKey.trim() ?? "";
}

/** Keep only RAG chunks that Jev judges to answer or materially support the query. */
export async function filterRagResultsWithJev(
  query: string,
  results: LocalRagSearchResult[],
  apiKey: string,
  proxyUrl?: string,
  proxyBypass?: string,
  fetchImpl?: JevFetch,
  useOpenRouter = true,
): Promise<LocalRagSearchResult[]> {
  if (results.length === 0) return [];
  if (!apiKey.trim()) throw new Error(`${useOpenRouter ? "OpenRouter" : "Jev"} API key is required for Jev RAG filtering`);

  const questions: Record<string, unknown> = {};
  results.forEach((result, index) => {
    questions[`result_${index}`] = {
      type: "choice",
      instructions: [
        "検索クエリとRAG検索結果を照合してください。",
        "検索結果がクエリへの回答または回答を支える情報として実質的に一致するか判定します。",
        "単語の重複だけでは一致とせず、クエリと無関係な結果は除外してください。",
        `検索結果: ${result.filePath}\n${result.text}`,
      ].join("\n"),
      criteria: {
        keep: "クエリに一致し、回答または回答の根拠として有用",
        exclude: "クエリに一致しない、または回答の根拠として有用でない",
      },
    };
  });

  const requestFetch = fetchImpl
    ?? (proxyUrl?.trim() ? createProxyFetch(proxyUrl, proxyBypass) : createNodeFetch());
  const endpoint = useOpenRouter ? OPENROUTER_DECISIONS_URL : TYPESAFE_DECISIONS_URL;
  const model = useOpenRouter ? JEV_MODEL : TYPESAFE_JEV_MODEL;
  const response = await requestFetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, state: `検索クエリ: ${query}`, questions }),
  });
  if (!response.ok) {
    throw new Error(`Jev RAG filtering failed: HTTP ${response.status}`);
  }

  const payload = await response.json() as {
    answers?: Record<string, { choice?: string }>;
  };
  if (!payload.answers) throw new Error("Jev RAG filtering returned an invalid response");

  return results.filter((_, index) => {
    const choice = payload.answers?.[`result_${index}`]?.choice;
    if (choice !== "keep" && choice !== "exclude") {
      throw new Error(`Jev RAG filtering omitted result_${index}`);
    }
    return choice === "keep";
  });
}
