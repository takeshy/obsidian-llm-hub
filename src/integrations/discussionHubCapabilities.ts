import type { EventRef } from "obsidian";
import { streamChatForModel } from "src/core/modelStreaming";
import { listDashboardModels } from "src/integrations/dashboardHubCapabilities";
import type { LlmHubPlugin } from "src/plugin";
import type { Attachment, Message, ModelType } from "src/types";

interface DiscussionMessage { role: "user" | "assistant"; content: string; attachments?: DiscussionAttachment[] }
interface DiscussionAttachment { name: string; mimeType: string; data: string; type?: "image" | "pdf" | "text" | "audio" | "video"; sourcePath?: string }
interface DiscussionIntegration {
  protocolVersion: 1;
  id: string;
  name: string;
  listModels: () => Promise<Array<{ id: string; name: string }>>;
  streamText: (request: { modelId: string; messages: DiscussionMessage[]; systemPrompt: string; abortSignal?: AbortSignal; onChunk: (text: string) => void }) => Promise<void>;
  getLegacyDiscussionSettings: () => unknown;
}
interface DiscussionHubApi { registerIntegration: (integration: DiscussionIntegration) => () => void }
interface DiscussionWorkspaceEvents {
  on: (name: "discussion-hub:ready", callback: (hub: DiscussionHubApi) => void) => EventRef;
  trigger: {
    (name: "discussion-hub:register-integration", integration: DiscussionIntegration): void;
    (name: "discussion-hub:unregister-integration", request: { id: string; integration: DiscussionIntegration }): void;
  };
}

function asAttachment(value: DiscussionAttachment): Attachment {
  return {
    name: value.name,
    mimeType: value.mimeType,
    data: value.data,
    type: value.type ?? (value.mimeType.startsWith("image/") ? "image" : value.mimeType === "application/pdf" ? "pdf" : "text"),
    sourcePath: value.sourcePath,
  };
}

export function registerDiscussionHubIntegration(plugin: LlmHubPlugin): void {
  const integration: DiscussionIntegration = {
    protocolVersion: 1,
    id: plugin.manifest.id,
    name: plugin.manifest.name,
    listModels: () => Promise.resolve(listDashboardModels(plugin).map(({ id, name }) => ({ id, name }))),
    streamText: async ({ modelId, messages, systemPrompt, abortSignal, onChunk }) => {
      const converted: Message[] = messages.map((message) => ({
        role: message.role,
        content: message.content,
        timestamp: Date.now(),
        attachments: message.attachments?.map(asAttachment),
      }));
      for await (const chunk of streamChatForModel(modelId as ModelType, converted, systemPrompt, plugin.settings, abortSignal)) {
        if (chunk.type === "text" && chunk.content) onChunk(chunk.content);
        else if (chunk.type === "error") throw new Error(chunk.error || "Discussion model failed.");
      }
    },
    getLegacyDiscussionSettings: () => plugin.workspaceState.discussionSettings ?? null,
  };
  const workspace = plugin.app.workspace as unknown as DiscussionWorkspaceEvents;
  plugin.registerEvent(workspace.on("discussion-hub:ready", (hub) => hub.registerIntegration(integration)));
  workspace.trigger("discussion-hub:register-integration", integration);
  const republish = () => workspace.trigger("discussion-hub:register-integration", integration);
  plugin.settingsEmitter.on("workspace-state-loaded", republish);
  plugin.register(() => {
    plugin.settingsEmitter.off("workspace-state-loaded", republish);
    workspace.trigger("discussion-hub:unregister-integration", { id: integration.id, integration });
  });
}
