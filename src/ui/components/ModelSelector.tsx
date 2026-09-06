import { ModelSelector as SharedModelSelector } from "obsidian-llm-hub-chat-ui";
import { t } from "src/i18n";
import type { ModelInfo, ModelType } from "src/types";

interface ModelSelectorProps {
  models: ModelInfo[]; value: ModelType; onChange: (model: ModelType) => void; disabled?: boolean;
}
export function filterModelOptions(models: ModelInfo[], query: string): ModelInfo[] {
  const seen = new Set<ModelType>();
  const unique = models.filter((model) => {
    if (seen.has(model.name)) return false;
    seen.add(model.name);
    return true;
  });
  const normalized = query.trim().toLowerCase();
  return normalized
    ? unique.filter((model) =>
        model.name.toLowerCase().includes(normalized)
        || model.displayName.toLowerCase().includes(normalized)
        || model.providerName?.toLowerCase().includes(normalized))
    : unique;
}


export default function ModelSelector({ models, value, onChange, disabled }: ModelSelectorProps) {
  return <SharedModelSelector classPrefix="llm-hub"
    models={models.map(model => ({ value: model.name, label: model.displayName, keywords: model.providerName }))}
    value={value} onChange={value => onChange(value as ModelType)} disabled={disabled}
    filterLabel={t("input.modelFilterPlaceholder")} emptyLabel={t("input.modelFilterEmpty")} />;
}
