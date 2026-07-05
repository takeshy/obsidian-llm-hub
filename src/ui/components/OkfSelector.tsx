import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import X from "lucide-react/dist/esm/icons/x";
import Plus from "lucide-react/dist/esm/icons/plus";
import type { OkfBundle } from "src/core/okfLoader";
import { t } from "src/i18n";

interface OkfSelectorProps {
  bundles: OkfBundle[];
  activeBundleIds: string[];
  onToggleBundle: (id: string) => void;
  disabled?: boolean;
}

export default function OkfSelector({
  bundles,
  activeBundleIds,
  onToggleBundle,
  disabled,
}: OkfSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const dropdown = dropdownRef.current;
    const selector = selectorRef.current;
    if (!dropdown || !selector) return;
    const rect = selector.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;
    dropdown.style.bottom = `${window.innerHeight - rect.top + 4}px`;
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (
        selectorRef.current && !selectorRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", updatePosition);
    };
  }, [showDropdown, updatePosition]);

  const activeBundles = bundles.filter(bundle => activeBundleIds.includes(bundle.id));

  if (bundles.length === 0) return null;

  return (
    <div className="llm-hub-skill-selector llm-hub-okf-selector" ref={selectorRef}>
      <BookOpen size={14} className="llm-hub-skill-icon" />
      {activeBundles.map(bundle => (
        <span key={bundle.id} className="llm-hub-skill-chip" title={bundle.id || bundle.name}>
          <span className="llm-hub-skill-chip-name is-static">{bundle.name}</span>
          <button
            className="llm-hub-skill-chip-remove"
            onClick={() => onToggleBundle(bundle.id)}
            disabled={disabled}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <button
        className="llm-hub-skill-add-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled}
        title={t("okf.add")}
      >
        <Plus size={12} />
      </button>
      {showDropdown && createPortal(
        <div className="llm-hub-skill-dropdown" ref={dropdownRef}>
          {bundles.map(bundle => (
            <label key={bundle.id} className="llm-hub-skill-dropdown-item">
              <input
                type="checkbox"
                checked={activeBundleIds.includes(bundle.id)}
                onChange={() => onToggleBundle(bundle.id)}
                disabled={disabled}
              />
              <div className="llm-hub-skill-dropdown-info">
                <span className="llm-hub-skill-dropdown-name">
                  {bundle.name}
                  {bundle.builtin && (
                    <span className="llm-hub-skill-builtin-badge">built-in</span>
                  )}
                </span>
                <span className="llm-hub-skill-dropdown-desc">
                  {bundle.builtin ? t("okf.builtinHelpDescription") : (bundle.id || bundle.name)}
                </span>
              </div>
            </label>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
