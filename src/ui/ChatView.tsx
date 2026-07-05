import { createRoot, Root } from "react-dom/client";
import { ItemView, WorkspaceLeaf, IconName, TFile } from "obsidian";
import type { LlmHubPlugin } from "src/plugin";
import TabContainer, { TabContainerRef, TabType } from "./components/TabContainer";

export const VIEW_TYPE_GEMINI_CHAT = "hub-chat-view";

export class ChatView extends ItemView {
  plugin: LlmHubPlugin;
  reactRoot!: Root;
  private tabContainerRef: TabContainerRef | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: LlmHubPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_GEMINI_CHAT;
  }

  getDisplayText(): string {
    return "LLM Hub";
  }

  getIcon(): IconName {
    return "brain-circuit";
  }

  async onOpen(): Promise<void> {
    await Promise.resolve();
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("llm-hub-chat-container");

    const root = createRoot(container);
    root.render(
      <TabContainer
        ref={(ref) => {
          this.tabContainerRef = ref;
        }}
        plugin={this.plugin}
      />
    );
    this.reactRoot = root;
  }

  async onClose(): Promise<void> {
    // Clear selection highlight when chat view is closed
    this.plugin.clearSelectionHighlight();
    this.reactRoot?.unmount();
    await Promise.resolve();
  }

  getActiveChat(): TFile | null {
    return this.tabContainerRef?.getActiveChat() ?? null;
  }

  setActiveChat(chat: TFile | null): void {
    this.tabContainerRef?.setActiveChat(chat);
  }

  setActiveTab(tab: TabType): void {
    this.tabContainerRef?.setActiveTab(tab);
  }

  askSelection(selection: { text: string; sourcePath?: string }): void {
    this.tabContainerRef?.askSelection(selection);
  }

  setChatDraft(content: string): void {
    this.tabContainerRef?.setChatDraft(content);
  }
}
