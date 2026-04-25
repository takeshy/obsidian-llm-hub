import { forwardRef } from "react";
import type { App } from "obsidian";
import type { Message, LocalLlmConfig } from "src/types";
import MessageBubble from "./MessageBubble";
import { t } from "src/i18n";

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
