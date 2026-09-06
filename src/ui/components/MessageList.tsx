import { forwardRef } from "react";
import { MessageList as SharedMessageList, Welcome } from "obsidian-llm-hub-common";
import type { App } from "obsidian";
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
  app: App;
  localLlmConfigs?: LocalLlmConfig[];
  skillsFolder?: string;
  currentDashboard?: DashboardLink | null;
  onOpenDashboard?: () => void;
  onCreateDashboard?: () => void;
  onAskLlmHubHelp?: () => void;
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>((props, ref) => (
  <SharedMessageList
    classPrefix="llm-hub"
    containerRef={ref}
    messages={props.messages}
    streamingContent={props.streamingContent}
    streamingThinking={props.streamingThinking}
    isLoading={props.isLoading}
    emptyState={<Welcome
      classPrefix="llm-hub"
      cardStyle="dashboard"
      title={t("chat.welcomeTitle")} hint={t("chat.welcomeHint")}
      help={{ title: t("chat.helpTitle"), description: t("chat.helpDescription"), label: t("chat.askLlmHubHelp"), onClick: props.onAskLlmHubHelp }}
      dashboard={{ title: t("chat.dashboardTitle"), description: t("chat.dashboardDescription"), openLabel: t("chat.openCurrentDashboard"), createLabel: t("chat.createDashboard"), current: props.currentDashboard, onOpen: props.onOpenDashboard, onCreate: props.onCreateDashboard }}
      tips={[{ text: t("chat.welcomeImage") }, { text: t("chat.welcomeCompact") }, { text: t("chat.welcomeNewChat") }]}
    />}
    renderMessage={(message, index, sourceFileName) => <MessageBubble
      message={message} app={props.app} localLlmConfigs={props.localLlmConfigs} skillsFolder={props.skillsFolder}
      sourceFileName={sourceFileName}
      onApplyEdit={props.onApplyEdit ? () => props.onApplyEdit!(index) : undefined}
      onDiscardEdit={props.onDiscardEdit ? () => props.onDiscardEdit!(index) : undefined}
    />}
    renderStreamingMessage={message => <MessageBubble message={message} isStreaming app={props.app} localLlmConfigs={props.localLlmConfigs} skillsFolder={props.skillsFolder} />}
  />
));
export default MessageList;
