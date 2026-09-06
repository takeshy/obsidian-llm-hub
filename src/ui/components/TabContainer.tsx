import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import type { LlmHubPlugin } from "src/plugin";
import type { TFile } from "obsidian";
import type { Attachment } from "src/types";
import Chat, { ChatRef } from "./Chat";
import SearchPanel from "./SearchPanel";
import { WorkflowPanel } from "./workflow/WorkflowPanel";
import { t } from "src/i18n";

export type TabType = "chat" | "search" | "workflow";

export interface TabContainerRef {
  getActiveChat: () => TFile | null;
  setActiveChat: (chat: TFile | null) => void;
  setActiveTab: (tab: TabType) => void;
  askSelection: (selection: { text: string; sourcePath?: string }) => void;
  setChatDraft: (content: string) => void;
}

interface TabContainerProps {
  plugin: LlmHubPlugin;
  onToggleSidebarWidth: () => boolean;
}

const TabContainer = forwardRef<TabContainerRef, TabContainerProps>(
  ({ plugin, onToggleSidebarWidth }, ref) => {
    const [activeTab, setActiveTab] = useState<TabType>("chat");
    const chatRef = useRef<ChatRef>(null);

    useImperativeHandle(ref, () => ({
      getActiveChat: () => chatRef.current?.getActiveChat() ?? null,
      setActiveChat: (chat: TFile | null) => chatRef.current?.setActiveChat(chat),
      setActiveTab: (tab: TabType) => setActiveTab(tab),
      askSelection: (selection) => {
        setActiveTab("chat");
        chatRef.current?.askSelection(selection);
      },
      setChatDraft: (content) => {
        setActiveTab("chat");
        chatRef.current?.setDraft(content);
      },
    }));

    const handleChatWithResults = useCallback((attachments: Attachment[]) => {
      chatRef.current?.clearRagSetting();
      chatRef.current?.addAttachments(attachments);
      setActiveTab("chat");
    }, []);

    const handleDiscussionWithResults = useCallback((attachments: Attachment[]) => {
      void plugin.openDiscussionHub({ attachments });
    }, [plugin]);

    return (
      <div className="llm-hub-tab-container">
        <div className="llm-hub-tab-bar">
          <button
            className={`llm-hub-tab ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            {t("chat.title")}
          </button>
          <button
            className={`llm-hub-tab ${activeTab === "workflow" ? "active" : ""}`}
            onClick={() => setActiveTab("workflow")}
          >
            {t("tab.workflowSkill")}
          </button>
          <button
            className={`llm-hub-tab ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            {t("search.tab")}
          </button>
        </div>
        <div className="llm-hub-tab-content">
          <div className={`llm-hub-tab-panel ${activeTab === "chat" ? "is-active" : ""}`}>
            <Chat ref={chatRef} plugin={plugin} onToggleSidebarWidth={onToggleSidebarWidth} />
          </div>
          <div className={`llm-hub-tab-panel ${activeTab === "workflow" ? "is-active" : ""}`}>
            <WorkflowPanel app={plugin.app} />
          </div>
          <div className={`llm-hub-tab-panel ${activeTab === "search" ? "is-active" : ""}`}>
            <SearchPanel plugin={plugin} onChatWithResults={handleChatWithResults} onDiscussionWithResults={handleDiscussionWithResults} />
          </div>
        </div>
      </div>
    );
  }
);

TabContainer.displayName = "TabContainer";

export default TabContainer;
