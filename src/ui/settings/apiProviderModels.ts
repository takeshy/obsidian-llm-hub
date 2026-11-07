import { normalizeDeprecatedGeminiModelName, type ApiProviderConfig } from "src/types";
import { getKnownModels } from "src/core/modelPricing";

export function getApiProviderModelChoices(config: ApiProviderConfig): string[] {
  // Do not suggest a built-in catalog before the provider has returned models.
  const fetchedModels = config.verified ? config.availableModels : [];
  const knownModels = fetchedModels.length > 0 ? getKnownModels(config.type) : [];
  // Keep the existing filtering for discovered aliases. Manual IDs are verbatim.
  const filteredModels = knownModels.length > 0
    ? fetchedModels.filter(model => normalizeDeprecatedGeminiModelName(model) === model)
    : fetchedModels;
  return [...new Set([...knownModels, ...filteredModels, ...(config.manualModels ?? [])])];
}

export function addManualApiProviderModel(config: ApiProviderConfig, value: string): boolean {
  const model = value.trim();
  if (!model) return false;
  config.manualModels = [...new Set([...(config.manualModels ?? []), model])];
  config.enabledModels = [...new Set([...config.enabledModels, model])];
  return true;
}

export function refreshApiProviderModels(config: ApiProviderConfig, models?: string[]): void {
  config.availableModels = models ? [...models] : [];
  if (models) {
    const retainedModels = new Set([...models, ...(config.manualModels ?? [])]);
    config.enabledModels = config.enabledModels.filter(model => retainedModels.has(model));
  }
}
