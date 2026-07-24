import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ItemView, WorkspaceLeaf, type IconName } from "obsidian";
import type { LlmHubPlugin } from "src/plugin";
import CliTerminalPanel from "src/ui/components/CliTerminalPanel";

export const CLI_TERMINAL_VIEW_TYPE = "llm-hub-cli-terminal-view";

export class CliTerminalView extends ItemView {
  private plugin: LlmHubPlugin;
  private reactRoot: Root | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: LlmHubPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return CLI_TERMINAL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "LLM Hub CLI terminal";
  }

  getIcon(): IconName {
    return "terminal";
  }

  async onOpen(): Promise<void> {
    await Promise.resolve();
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("llm-hub-cli-terminal-view");

    const root = createRoot(container);
    root.render(createElement(CliTerminalPanel, {
      plugin: this.plugin,
      showProviderButtons: true,
    }));
    this.reactRoot = root;
  }

  async onClose(): Promise<void> {
    this.reactRoot?.unmount();
    this.reactRoot = null;
    await Promise.resolve();
  }
}
