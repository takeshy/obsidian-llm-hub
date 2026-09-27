import type { EventRef } from "obsidian";
import type { LlmHubPlugin } from "src/plugin";
import { getAvailableModels } from "src/core/availableModels";
import { getDefaultModel, SKILLS_FOLDER, type Message, type ModelType } from "src/types";
import { HeadlessConversationRunner, type HeadlessConversation } from "src/core/headlessConversation";
import { streamChatForModel } from "src/core/modelStreaming";
import { discoverSkills } from "src/core/skillsLoader";
import { modelSupportsWebSearch } from "src/core/webSearch";
import { getGeminiClient } from "src/core/gemini";
import { CONNECT_READY, CONNECT_REGISTER, CONNECT_UNREGISTER, type ConnectBackend } from "./connectContract";

interface ConnectEvents {
  on(name: string, callback: (hub: { registerBackend(backend: ConnectBackend): void }) => void): EventRef;
  trigger(name: string, value: unknown): void;
}

export function registerConnectHubIntegration(plugin: LlmHubPlugin): void {
  const lifecycle = new AbortController();
  const run = async <T>(signal: AbortSignal, work: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal.aborted || lifecycle.signal.aborted) throw new Error("LLM Hub is unavailable");
    signal.addEventListener("abort", abort, { once: true });
    lifecycle.signal.addEventListener("abort", abort, { once: true });
    try { return await work(controller.signal); }
    finally {
      signal.removeEventListener("abort", abort);
      lifecycle.signal.removeEventListener("abort", abort);
    }
  };
  const backend: ConnectBackend = {
    protocolVersion: 1, id: plugin.manifest.id, name: plugin.manifest.name,
    listModels: () => getAvailableModels(plugin.settings),
    getDefaultModel: () => getDefaultModel(plugin.settings),
    listRagSettings: () => plugin.getRagSettingNames(),
    supportsWebSearch: model => modelSupportsWebSearch(model as ModelType, plugin.settings.apiProviders),
    listSkills: async () => ({
      prompts: structuredClone(plugin.settings.slashCommands),
      folders: (await discoverSkills(plugin.app, plugin.settings.skillsFolder || SKILLS_FOLDER)).map(({ name, description, folderPath }) => ({ name, description, folderPath })),
    }),
    generate: request => run(request.signal, async signal => {
      const conversation = structuredClone(request.conversation) as HeadlessConversation;
      const model = conversation.model || request.model || getDefaultModel(plugin.settings);
      if (!getAvailableModels(plugin.settings).some(m => m.name === model)) throw new Error("Model is unavailable");
      if (request.vaultFolders?.some(folder => !folder.trim() || folder.startsWith("/") || folder.includes("\\") || folder.split("/").some(part => part === ".." || part === "."))) {
        throw new Error("Use vault-relative folder paths");
      }
      if (conversation.activeSkillPaths.length) {
        const skills = await discoverSkills(plugin.app, plugin.settings.skillsFolder || SKILLS_FOLDER);
        conversation.activeSkillPaths = conversation.activeSkillPaths.map(name => skills.find(skill => skill.name === name || skill.folderPath === name)?.folderPath ?? name);
      }
      const answer = await new HeadlessConversationRunner(plugin.app, plugin, request, signal).generate(conversation);
      if (signal.aborted) throw new Error("Conversation cancelled");
      return { answer, conversation };
    }),
    generateText: request => run(request.signal, async signal => {
      if (!getAvailableModels(plugin.settings).some(m => m.name === request.model)) throw new Error("Model is unavailable");
      let text = "";
      for await (const chunk of streamChatForModel(request.model as ModelType, request.messages as Message[], request.systemPrompt, plugin.settings, signal)) {
        if (signal.aborted) throw new Error("Conversation cancelled");
        if (chunk.type === "error") throw new Error(chunk.error || "Model failed");
        if (chunk.type === "text") text += chunk.content ?? "";
      }
      return text;
    }),
    research: request => run(request.signal, async signal => {
      const client = getGeminiClient();
      if (!client) throw new Error("Gemini API is not configured");
      let content = "";
      let interactionId: string | undefined;
      for await (const chunk of client.deepResearchStream(request.query, request.previousInteractionId)) {
        if (signal.aborted) throw new Error("Research cancelled");
        if (chunk.type === "error") throw new Error(chunk.error || "Research failed");
        if (chunk.type === "text") content += chunk.content ?? "";
        if (chunk.type === "done") interactionId = chunk.interactionId;
      }
      return { content, interactionId };
    }),
    getDiscussionApi: () => plugin.getDiscussionHubApi(),
    getLegacyConnections: () => {
      const old = plugin.settings.kakeratta;
      const server = plugin.settings.mcpServers.find(s => (s.id || s.name) === old?.serverId);
      return structuredClone({
        discord: plugin.settings.discord,
        kakeratta: { enabled: !!(old?.enabled && server?.enabled && server.autoApprove && server.transport !== "stdio"), model: old?.model ?? "", url: server?.url ?? "", headers: server?.headers ?? {}, personas: {} },
        credentialStorage: plugin.settings.credentialStorage,
      });
    },
    completeMigration: async () => {
      plugin.settings.discord.enabled = false;
      if (plugin.settings.kakeratta) plugin.settings.kakeratta.enabled = false;
      await plugin.saveSettings();
    },
  };
  const workspace = plugin.app.workspace as unknown as ConnectEvents;
  plugin.registerEvent(workspace.on(CONNECT_READY, hub => hub.registerBackend(backend)));
  workspace.trigger(CONNECT_REGISTER, backend);
  plugin.register(() => {
    lifecycle.abort();
    workspace.trigger(CONNECT_UNREGISTER, backend);
  });
}
