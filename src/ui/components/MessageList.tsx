import { forwardRef } from "react";
import type { App } from "obsidian";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import Plus from "lucide-react/dist/esm/icons/plus";
import type { Message, LocalLlmConfig } from "src/types";
import MessageBubble from "./MessageBubble";
import { t } from "src/i18n";

interface DashboardLink {
  basename: string;
  path: string;
}

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  streamingThinking: string;
  isLoading: boolean;
  onApplyEdit?: (messageIndex: number) => Promise<void>;
  onDiscardEdit?: (messageIndex: number) => void;
  alwaysThink?: boolean;
  app: App;
  localLlmConfigs?: LocalLlmConfig[];
  skillsFolder?: string;
  currentDashboard?: DashboardLink | null;
  onOpenDashboard?: () => void;
  onCreateDashboard?: () => void;
  onAskLlmHubHelp?: () => void;
}

// Extract source file name from user message (e.g., From "xxx.md":)
function extractSourceFileName(content: string): string | null {
  const match = content.match(/From "([^"]+\.md)"/);
  if (match) {
    // Get just the file name without path
    const fullPath = match[1];
    const parts = fullPath.split("/");
    return parts[parts.length - 1].replace(".md", "");
  }
  return null;
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>(({
  messages,
  streamingContent,
  streamingThinking,
  isLoading,
  onApplyEdit,
  onDiscardEdit,
  alwaysThink,
  app,
  localLlmConfigs,
  skillsFolder,
  currentDashboard,
  onOpenDashboard,
  onCreateDashboard,
  onAskLlmHubHelp,
}, ref) => {
  // Get source file name for assistant message (from previous user message)
  const getSourceFileForIndex = (index: number): string | null => {
    if (messages[index]?.role !== "assistant") return null;
    // Look at the previous user message
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        return extractSourceFileName(messages[i].content);
      }
    }
    return null;
  };

  return (
    <div className="llm-hub-messages" ref={ref}>
      {messages.length === 0 && !streamingContent && (
        <div className="llm-hub-empty-state">
          <p>{t("chat.welcomeTitle")}</p>
          <p className="llm-hub-empty-hint">
            {t("chat.welcomeHint")}
          </p>
          {onAskLlmHubHelp && (
            <div className="llm-hub-empty-card">
              <div className="llm-hub-empty-card-heading">
                <BookOpen size={16} aria-hidden="true" />
                <span>{t("chat.helpTitle")}</span>
              </div>
              <p className="llm-hub-empty-card-description">
                {t("chat.helpDescription")}
              </p>
              <div className="llm-hub-empty-card-actions">
                <button
                  type="button"
                  className="llm-hub-empty-card-action"
                  onClick={onAskLlmHubHelp}
                >
                  <BookOpen size={14} aria-hidden="true" />
                  <span>{t("chat.askLlmHubHelp")}</span>
                </button>
              </div>
            </div>
          )}
          <div className="llm-hub-empty-card">
            <div className="llm-hub-empty-card-heading">
              <LayoutDashboard size={16} aria-hidden="true" />
              <span>{t("chat.dashboardTitle")}</span>
            </div>
            <p className="llm-hub-empty-card-description">
              {t("chat.dashboardDescription")}
            </p>
            <div className="llm-hub-empty-card-actions">
              {currentDashboard && onOpenDashboard && (
                <button
                  type="button"
                  className="llm-hub-empty-card-action"
                  title={currentDashboard.path}
                  onClick={onOpenDashboard}
                >
                  <LayoutDashboard size={14} aria-hidden="true" />
                  <span>{t("chat.openCurrentDashboard")}: {currentDashboard.basename}</span>
                </button>
              )}
              {onCreateDashboard && (
                <button
                  type="button"
                  className="llm-hub-empty-card-action"
                  onClick={onCreateDashboard}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>{t("chat.createDashboard")}</span>
                </button>
              )}
            </div>
          </div>
          <div className="llm-hub-empty-tips">
            {!alwaysThink && (
              <div className="llm-hub-empty-tip">
                <span className="llm-hub-empty-tip-icon">💭</span>
                <span>{t("chat.welcomeThinking")}</span>
              </div>
            )}
            <div className="llm-hub-empty-tip">
              <span className="llm-hub-empty-tip-icon">🎨</span>
              <span>{t("chat.welcomeImage")}</span>
            </div>
            <div className="llm-hub-empty-tip">
              <span className="llm-hub-empty-tip-icon">📦</span>
              <span>{t("chat.welcomeCompact")}</span>
            </div>
            <div className="llm-hub-empty-tip">
              <span className="llm-hub-empty-tip-icon">💡</span>
              <span>{t("chat.welcomeNewChat")}</span>
            </div>
          </div>
        </div>
      )}

      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          message={message}
          sourceFileName={getSourceFileForIndex(index)}
          onApplyEdit={onApplyEdit ? () => onApplyEdit(index) : undefined}
          onDiscardEdit={onDiscardEdit ? () => onDiscardEdit(index) : undefined}
          app={app}
          localLlmConfigs={localLlmConfigs}
          skillsFolder={skillsFolder}
        />
      ))}

      {(streamingContent || streamingThinking) && (
        <MessageBubble
          message={{
            role: "assistant",
            content: streamingContent,
            timestamp: Date.now(),
            thinking: streamingThinking || undefined,
          }}
          isStreaming
          app={app}
          localLlmConfigs={localLlmConfigs}
          skillsFolder={skillsFolder}
        />
      )}

      {isLoading && !streamingContent && !streamingThinking && (
        <div className="llm-hub-loading">
          <span className="llm-hub-loading-dot" />
          <span className="llm-hub-loading-dot" />
          <span className="llm-hub-loading-dot" />
        </div>
      )}
    </div>
  );
});

export default MessageList;
