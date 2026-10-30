import type { ApiProviderConfig, LlmHubSettings } from "../types";
import type { LocalRagSearchResult } from "./localRagStore";
import { createNodeFetch, createProxyFetch } from "./proxyFetch";
import type { RagPdfImage } from "./ragPdfImages";

export const OPENROUTER_DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
export const JEV_MODEL = "~typesafe/jev-latest";
export const TYPESAFE_DECISIONS_URL = "https://api.typesafe.ai/v1/systemone";
export const TYPESAFE_JEV_MODEL = "jev-latest";

type JevFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function getOpenRouterApiKey(providers: ApiProviderConfig[]): string {
  return providers.find(provider => provider.type === "openrouter" && provider.apiKey.trim())?.apiKey.trim() ?? "";
}

/** Shared credentials for per-index filtering. An unconfigured Jev is inactive. */
export function getJevRagFilterConfig(
  settings: Pick<LlmHubSettings, "apiProviders" | "jevApiKey" | "jevUseOpenRouter">,
): { apiKey: string; useOpenRouter: boolean } | null {
  const openRouterKey = getOpenRouterApiKey(settings.apiProviders);
  const useOpenRouter = settings.jevUseOpenRouter && openRouterKey.length > 0;
  const apiKey = (useOpenRouter ? openRouterKey : settings.jevApiKey).trim();
  return apiKey ? { apiKey, useOpenRouter } : null;
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
  resolvePdfText?: (result: LocalRagSearchResult) => Promise<string | null>,
  resolvePdfImages?: (result: LocalRagSearchResult) => Promise<RagPdfImage[] | null>,
): Promise<LocalRagSearchResult[]> {
  if (results.length === 0) return [];
  if (!apiKey.trim()) throw new Error(`${useOpenRouter ? "OpenRouter" : "Jev"} API key is required for Jev RAG filtering`);

  const requestFetch = fetchImpl
    ?? (proxyUrl?.trim() ? createProxyFetch(proxyUrl, proxyBypass) : createNodeFetch());
  const endpoint = useOpenRouter ? OPENROUTER_DECISIONS_URL : TYPESAFE_DECISIONS_URL;
  const model = useOpenRouter ? JEV_MODEL : TYPESAFE_JEV_MODEL;
  async function decide(questions: Record<string, unknown>, assets?: Record<string, RagPdfImage>) {
    const response = await requestFetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        ...(assets ? { "TypeSafe-Danger-Zone-Images": "true", "TypeSafe-Danger-Zone-Long-Context": "true" } : {}),
      },
      body: JSON.stringify({ model, state: `検索クエリ: ${query}`, questions, ...(assets ? { assets } : {}) }),
    });
    if (!response.ok) throw new Error(`Jev RAG filtering failed: HTTP ${response.status}`);
    const payload = await response.json() as { answers?: Record<string, { choice?: string }> };
    if (!payload.answers) throw new Error("Jev RAG filtering returned an invalid response");
    for (const key of Object.keys(questions)) {
      const choice = payload.answers[key]?.choice;
      if (choice !== "keep" && choice !== "exclude") throw new Error(`Jev RAG filtering omitted ${key}`);
    }
    return payload.answers;
  }
  const questions: Record<string, unknown> = {};
  const retained = new Set<number>();
  for (const [index, result] of results.entries()) {
    let text = result.text;
    let assets: Record<string, RagPdfImage> | undefined;
    if (result.contentType === "pdf" && /^\[Pdf:/i.test(text.trim())) {
      // Native PDF embeddings store a label, not the document's contents.
      // Use page images when the PDF has no extractable text layer.
      let extracted: string | null = null;
      try {
        extracted = await resolvePdfText?.(result) ?? null;
      } catch (error) {
        console.warn(`Failed to extract PDF text for Jev filtering: ${result.filePath}`, error);
      }
      if (!extracted?.trim()) {
        let images: RagPdfImage[] | null = null;
        try {
          images = await resolvePdfImages?.(result) ?? null;
        } catch (error) {
          console.warn(`Failed to render PDF for Jev filtering: ${result.filePath}`, error);
        }
        if (!images?.length) {
          retained.add(index);
          continue;
        }
        const imageAssets: Record<string, RagPdfImage> = {};
        assets = imageAssets;
        const references = images.map((image) => {
          const reference = crypto.randomUUID();
          imageAssets[reference] = image;
          return reference;
        });
        text = `該当ページ (${result.pageLabel ?? "PDF"}) の画像: ${references.join("\n")}`;
      }
      if (extracted?.trim()) text = extracted;
    }
    const question = {
      type: "choice",
      instructions: [
        "検索クエリとRAG検索結果を照合してください。",
        "検索結果がクエリへの回答または回答を支える情報として実質的に一致するか判定します。",
        "単語の重複だけでは一致とせず、クエリと無関係な結果は除外してください。",
        `検索結果: ${result.filePath}\n${text}`,
      ].join("\n"),
      criteria: {
        keep: "クエリに一致し、回答または回答の根拠として有用",
        exclude: "クエリに一致しない、または回答の根拠として有用でない",
      },
    };
    const key = `result_${index}`;
    if (assets) {
      // Each complete PDF chunk gets its own bounded image request. Do not
      // repeat its images across unrelated questions or combine many scans.
      const answers = await decide({ [key]: question }, assets);
      if (answers[key].choice === "keep") retained.add(index);
    } else {
      questions[key] = question;
    }
  }
  if (Object.keys(questions).length === 0) return results.filter((_, index) => retained.has(index));

  const answers = await decide(questions);
  return results.filter((_, index) => retained.has(index) || answers[`result_${index}`]?.choice === "keep");
}
