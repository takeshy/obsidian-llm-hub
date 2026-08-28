import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Check from "lucide-react/dist/esm/icons/check";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Search from "lucide-react/dist/esm/icons/search";
import { t } from "src/i18n";
import type { ModelInfo, ModelType } from "src/types";

interface ModelSelectorProps {
  models: ModelInfo[];
  value: ModelType;
  onChange: (model: ModelType) => void;
  disabled?: boolean;
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const filteredModels = useMemo(() => filterModelOptions(models, query), [models, query]);
  const selectedModel = models.find((model) => model.name === value);

  useEffect(() => {
    if (!open) return;
    const ownerDocument = rootRef.current?.ownerDocument ?? document;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    ownerDocument.addEventListener("mousedown", handleOutsideClick);
    window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => ownerDocument.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  useEffect(() => setSelectedIndex(0), [query]);

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const selectModel = (model: ModelType) => {
    onChange(model);
    setQuery("");
    setOpen(false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, filteredModels.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing && filteredModels[selectedIndex]) {
      event.preventDefault();
      selectModel(filteredModels[selectedIndex].name);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="llm-hub-model-picker" ref={rootRef}>
      <button
        type="button"
        className="llm-hub-model-picker-trigger"
        onClick={() => {
          setQuery("");
          setOpen((current) => !current);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selectedModel?.displayName ?? value}
      >
        <span>{selectedModel?.displayName ?? value}</span>
        <ChevronDown size={11} aria-hidden="true" />
      </button>
      {open && (
        <div className="llm-hub-model-picker-popover">
          <div className="llm-hub-model-picker-search">
            <Search size={13} aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("input.modelFilterPlaceholder")}
              aria-label={t("input.modelFilterPlaceholder")}
            />
          </div>
          <div className="llm-hub-model-picker-list" role="listbox" ref={listRef}>
            {filteredModels.length > 0 ? filteredModels.map((model, index) => (
              <button
                type="button"
                key={model.name}
                className={`llm-hub-model-picker-option${index === selectedIndex ? " is-selected" : ""}`}
                onClick={() => selectModel(model.name)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                aria-selected={model.name === value}
                title={model.name}
              >
                <span>{model.displayName}</span>
                {model.name === value && <Check size={13} aria-hidden="true" />}
              </button>
            )) : (
              <div className="llm-hub-model-picker-empty">{t("input.modelFilterEmpty")}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
