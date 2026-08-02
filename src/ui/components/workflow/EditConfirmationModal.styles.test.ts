import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "styles.css"), "utf8");

function getRule(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`));
  expect(match, `Expected a CSS rule for ${selector}`).not.toBeNull();
  return match?.[1] ?? "";
}

describe("edit confirmation modal layout", () => {
  it("opens at a workspace-scale size while staying within the viewport", () => {
    const rule = getRule(".llm-hub-edit-confirm-modal");

    expect(rule).toContain("width: min(92vw, 1400px)");
    expect(rule).toContain("height: min(88vh, 900px)");
    expect(rule).toContain("max-width: calc(100vw - 32px)");
    expect(rule).toContain("max-height: calc(100vh - 32px)");
  });

  it("lets the diff preview claim and scroll within the available height", () => {
    const modalContentRule = getRule(".llm-hub-edit-confirm-modal .modal-content");
    const previewRule = getRule(".llm-hub-edit-confirm-preview");
    const previewContentRule = getRule(".llm-hub-edit-confirm-preview-content");

    expect(modalContentRule).toContain("min-height: 0");
    expect(modalContentRule).toContain("overflow: hidden");
    expect(previewRule).toContain("flex: 1");
    expect(previewRule).toContain("min-height: 0");
    expect(previewContentRule).toContain("min-height: 0");
    expect(previewContentRule).toContain("overflow: auto");
  });

  it("supports a viewport-filling mode without active resize handles", () => {
    const fullscreenRule = getRule(".llm-hub-edit-confirm-modal.is-fullscreen");
    const resizeHandleRule = getRule(
      ".llm-hub-edit-confirm-modal.is-fullscreen .llm-hub-resize-handle",
    );

    expect(fullscreenRule).toContain("position: fixed !important");
    expect(fullscreenRule).toContain("width: calc(100vw - 16px) !important");
    expect(fullscreenRule).toContain("height: calc(100vh - 16px) !important");
    expect(fullscreenRule).toContain("transform: none !important");
    expect(resizeHandleRule).toContain("display: none");
  });
});
