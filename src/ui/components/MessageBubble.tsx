// The message bubble lives in the shared library; this supplies what only this plugin
// knows: how a model id reads, and where its workflow panel is.
import type { App } from "obsidian";
import { MessageBubbleView } from "obsidian-llm-hub-common/modals";
import type { Message, LocalLlmConfig } from "src/types";
import { isApiProviderModel, isLocalLlmModel, getLocalLlmId, getLocalLlmModelName, localLlmDisplayName } from "src/types";
import { ChatView, VIEW_TYPE_GEMINI_CHAT } from "src/ui/ChatView";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  sourceFileName?: string | null;
  onApplyEdit?: () => Promise<void>;
  onDiscardEdit?: () => void;
  app: App;
  localLlmConfigs?: LocalLlmConfig[];
  skillsFolder?: string;
}

function formatModelName(model: string, localLlmConfigs?: LocalLlmConfig[]): string {
  // Strip "api:" prefix for display
  if (isApiProviderModel(model)) return model.slice(4);
  // For "local-llm:<id>:<model>" resolve the saved config (incl. disabled ones, so history
  // of a config the user has since toggled off still renders with its real label) and
  // overlay the specific model name so each chat dropdown entry stays distinguishable.
  if (isLocalLlmModel(model)) {
    const id = getLocalLlmId(model);
    const modelName = getLocalLlmModelName(model);
    const config = id && localLlmConfigs ? localLlmConfigs.find(c => c.id === id) : null;
    if (config) return localLlmDisplayName(config, modelName);
    if (modelName) return `Local LLM (${modelName})`;
    return id ? `Local LLM (${id})` : "Local LLM";
  }
  return model;
}

export default function MessageBubble({ localLlmConfigs, ...props }: MessageBubbleProps) {
  return (
    <MessageBubbleView
      {...props}
      formatModelName={(model) => formatModelName(model, localLlmConfigs)}
      onOpenWorkflow={() => revealWorkflowTab(props.app, "")}
    />
  );
}

/** Reveals a workflow file in this plugin's own workflow panel. */
function revealWorkflowTab(app: App, _path: string): void {
  for (const leaf of app.workspace.getLeavesOfType(VIEW_TYPE_GEMINI_CHAT)) {
    const view = leaf.view;
    if (view instanceof ChatView) {
      view.setActiveTab("workflow");
      void app.workspace.revealLeaf(leaf);
    }
  }
}
