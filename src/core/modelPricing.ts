// Model pricing data (USD per token)
// Sources:
//   Gemini: https://ai.google.dev/pricing
//   OpenAI: https://platform.openai.com/docs/pricing
//   Anthropic: https://docs.anthropic.com/en/docs/about-claude/models

export interface TokenPricing {
  input: number;
  output: number;
}

/**
 * Pricing per token (USD). Values are per-million-token rates divided by 1e6.
 */
export const MODEL_PRICING: Record<string, TokenPricing> = {
  // Gemini models
  "gemini-2.5-flash":                    { input: 0.30  / 1e6, output:   2.50 / 1e6 },
  "gemini-2.5-flash-lite":               { input: 0.10  / 1e6, output:   0.40 / 1e6 },
  "gemini-2.5-pro":                      { input: 1.25  / 1e6, output:  10.00 / 1e6 },
  "gemini-3-flash-preview":              { input: 0.50  / 1e6, output:   3.00 / 1e6 },
  "gemini-3.1-flash-lite-preview":       { input: 0.25  / 1e6, output:   1.50 / 1e6 },
  "gemini-3.1-pro-preview":              { input: 2.00  / 1e6, output:  12.00 / 1e6 },
  "gemini-3.1-pro-preview-customtools":  { input: 2.00  / 1e6, output:  12.00 / 1e6 },
  "gemini-3-pro-image-preview":          { input: 2.00  / 1e6, output: 120.00 / 1e6 },
  "gemini-3.1-flash-image-preview":      { input: 0.25  / 1e6, output:  60.00 / 1e6 },

  // OpenAI models (March 2026)
  // Source: https://openai.com/api/pricing/
  "gpt-5.4":       { input:  2.50  / 1e6, output: 15.00 / 1e6 },
  "gpt-5.4-mini":  { input:  0.75  / 1e6, output:  4.50 / 1e6 },
  "gpt-5.4-nano":  { input:  0.20  / 1e6, output:  1.25 / 1e6 },
  "o3":            { input:  2.00  / 1e6, output:  8.00 / 1e6 },

  // Anthropic models
  "claude-opus-4-6":   { input: 5.00 / 1e6, output: 25.00 / 1e6 },
  "claude-sonnet-4-6": { input: 3.00 / 1e6, output: 15.00 / 1e6 },
  "claude-opus-4-5":   { input: 5.00 / 1e6, output: 25.00 / 1e6 },
  "claude-sonnet-4-5": { input: 3.00 / 1e6, output: 15.00 / 1e6 },
  "claude-haiku-4-5":  { input: 1.00 / 1e6, output:  5.00 / 1e6 },
};

/**
 * Fallback model list for OpenCode Go.
 * Used because OpenCode Go does not expose `/v1/models`.
 * Source: https://opencode.ai/docs/ja/go/ (14 models listed).
 * Snapshot as of 2026-04-24 — refresh when OpenCode Go adds/renames models.
 *
 * NOTE: The OpenCode TUI config uses an `opencode-go/<model-id>` namespace,
 * but the `/v1/chat/completions` API takes the BARE model id only. Sending
 * `opencode-go/kimi-k2.6` gets rejected with `ModelError: Model ... not
 * supported`. These entries therefore intentionally omit the prefix.
 */
export const OPENCODE_GO_FALLBACK_MODELS: string[] = [
  "glm-5",
  "glm-5.1",
  "kimi-k2.5",
  "kimi-k2.6",
  "deepseek-v4-pro",
  "deepseek-v4-flash",
  "mimo-v2-pro",
  "mimo-v2-omni",
  "mimo-v2.5-pro",
  "mimo-v2.5",
  "minimax-m2.7",
  "minimax-m2.5",
  "qwen3.6-plus",
  "qwen3.5-plus",
];

/** Provider type → known model names from the pricing table */
const KNOWN_MODELS_BY_PROVIDER: Record<string, string[]> = {
  gemini: Object.keys(MODEL_PRICING).filter(k => k.startsWith("gemini-")),
  openai: Object.keys(MODEL_PRICING).filter(k => k.startsWith("gpt-") || /^o\d/.test(k)),
  anthropic: Object.keys(MODEL_PRICING).filter(k => k.startsWith("claude-")),
  opencodego: OPENCODE_GO_FALLBACK_MODELS,
};

/**
 * Get known model names for a provider type.
 * Returns empty array for unknown/custom providers.
 */
export function getKnownModels(providerType: string): string[] {
  return KNOWN_MODELS_BY_PROVIDER[providerType] ?? [];
}

/**
 * Calculate the cost for a given model and token usage.
 *
 * Looks up pricing by exact model name first, then falls back to prefix
 * matching (longest prefix wins) so that dated variants like
 * "gpt-4o-2024-11-20" resolve to the "gpt-4o" entry.
 *
 * @returns Total cost in USD, or `undefined` if no pricing data is available.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | undefined {
  // Exact match
  let pricing = MODEL_PRICING[model];

  // Prefix match – pick the longest matching key
  if (!pricing) {
    let bestLen = 0;
    for (const key of Object.keys(MODEL_PRICING)) {
      if (model.startsWith(key) && key.length > bestLen) {
        pricing = MODEL_PRICING[key];
        bestLen = key.length;
      }
    }
  }

  if (!pricing) {
    return undefined;
  }

  return pricing.input * inputTokens + pricing.output * outputTokens;
}
