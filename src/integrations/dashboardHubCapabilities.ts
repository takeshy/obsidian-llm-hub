import { Platform } from "obsidian";
import { buildSkillSystemPrompt, collectSkillScripts, type LoadedSkill } from "src/core/skillsLoader";
import type { LlmHubPlugin } from "src/plugin";
import { streamChatForModel } from "src/core/modelStreaming";
import { GeminiClient } from "src/core/gemini";
import { openaiChatWithToolsStream } from "src/core/openaiProvider";
import { anthropicChatWithToolsStream } from "src/core/anthropicProvider";
import { localLlmChatStream } from "src/core/localLlmProvider";
import { AntigravityCliProvider, ClaudeCliProvider, CodexCliProvider } from "src/core/cliProvider";
import { getEnabledVaultTools } from "obsidian-llm-hub-common/core";
import { createMcpToolset } from "obsidian-llm-hub-common/mcp";
import { createSkillToolset } from "obsidian-llm-hub-common/workflow";
import {
  assertTimelineAnswerSupported, dashboardBasePrompt, dashboardRewritePrompt, dashboardWorkflowPrompt,
  listDashboardSkills, loadDashboardSkills, runDashboardWorkflow as runWorkflow, stripYamlFence,
  timelineAnswerMessages, timelineAnswerSystemPrompt,
  type DashboardAiModel, type DashboardBaseRequest, type DashboardRewriteRequest, type DashboardTimelineAnswerOptions,
  type DashboardTimelineAnswerRequest, type DashboardWorkflowGenerationRequest, type DashboardWorkflowRequest,
} from "obsidian-llm-hub-common/dashboard";
import { createToolExecutor } from "src/vault/toolExecutor";
import { loadBuiltinSkill, builtinFolderPath } from "src/core/builtinSkills";
import { WORKFLOW_SPECIFICATION } from "src/workflow/workflowSpec";
import { modelSupportsWebSearch } from "src/core/webSearch";
import { searchLocalRag } from "src/core/localRagStore";
import { MAX_MARKER_AGENT_ITERATIONS, executeSkillScript, runSkillMarkers } from "src/core/skillScripts";
import {
  getApiProviderId, getApiProviderModelName, getGeminiApiKey, getLocalLlmConfig,
  isApiProviderModel, isImageGenerationModel, isLocalLlmModel,
  type Message, type ModelType, type StreamChunk, type ToolDefinition,
} from "src/types";

export type {
  DashboardAiModel, DashboardBaseRequest, DashboardRewriteRequest, DashboardTimelineAnswerOptions,
  DashboardTimelineAnswerRequest, DashboardWorkflowGenerationRequest, DashboardWorkflowRequest,
};
/** Tools beyond the Vault ones, with the executor that answers them. */
interface ExtraTools { tools: ToolDefinition[]; execute: (name: string, args: Record<string, unknown>) => Promise<unknown> }

export function listDashboardModels(plugin: LlmHubPlugin): DashboardAiModel[] {
  const models: DashboardAiModel[] = [];
  for (const provider of plugin.settings.apiProviders.filter((entry) => entry.enabled && entry.verified)) {
    for (const model of provider.enabledModels) {
      const id = `api:${provider.id}:${model}`;
      if (!isImageGenerationModel(id)) models.push({ id, name: `${provider.name} (${model})`, capabilities: { text: true, vaultRead: true, tools: true } });
    }
  }
  for (const config of plugin.settings.localLlmConfigs ?? []) {
    if (!config.verified || config.enabled === false) continue;
    const names = config.enabledModels?.length ? config.enabledModels : config.availableModels ?? [];
    for (const model of names) models.push({ id: `local-llm:${config.id}:${model}`, name: `${config.name || "Local LLM"} (${model})`, capabilities: { text: true, vaultRead: false, tools: false } });
  }
  if (!Platform.isMobile && plugin.settings.cliConfig.cliVerified) models.push({ id: "antigravity-cli", name: "Antigravity CLI", capabilities: { text: true, vaultRead: true, tools: false } });
  if (!Platform.isMobile && plugin.settings.cliConfig.claudeCliVerified) models.push({ id: "claude-cli", name: "Claude CLI", capabilities: { text: true, vaultRead: true, tools: false } });
  if (!Platform.isMobile && plugin.settings.cliConfig.codexCliVerified) models.push({ id: "codex-cli", name: "Codex CLI", capabilities: { text: true, vaultRead: true, tools: false } });
  return models;
}

export function runDashboardWorkflow(plugin: LlmHubPlugin, request: DashboardWorkflowRequest): Promise<string> {
  return runWorkflow(plugin.app, request);
}

function toolStream(plugin: LlmHubPlugin, model: ModelType, messages: Message[], systemPrompt: string, signal?: AbortSignal, vaultRead = true, webSearch = false, extra?: ExtraTools): AsyncGenerator<StreamChunk> {
  const vaultTools = vaultRead ? getEnabledVaultTools({ allowWrite: false, allowDelete: false, ragSyncStatus: false }) : [];
  const vaultExecute = createToolExecutor(plugin.app, { listNotesLimit: plugin.settings.listNotesLimit, maxNoteChars: plugin.settings.maxNoteChars,
    limitVaultToolScope: true, vaultToolAllowedFolders: plugin.settings.cloudVaultToolAllowedFolders });
  const extraNames = new Set(extra?.tools.map((tool) => tool.name));
  const tools = [...vaultTools, ...(extra?.tools ?? [])];
  const execute = async (name: string, args: Record<string, unknown>) => {
    if (extra && extraNames.has(name)) return extra.execute(name, args);
    return vaultExecute(name, args);
  };
  if (isApiProviderModel(model)) {
    const provider = plugin.settings.apiProviders.find((entry) => entry.id === getApiProviderId(model) && entry.enabled && entry.verified);
    if (!provider) throw new Error(`Provider not found for model: ${model}`);
    const modelName = getApiProviderModelName(model);
    if (provider.type === "gemini") {
      const key = provider.apiKey || getGeminiApiKey(plugin.settings);
      if (!key) throw new Error("Gemini API key is not configured.");
      return new GeminiClient(key, modelName as ModelType, plugin.settings.proxyUrl, plugin.settings.proxyBypass, plugin.settings.webSearch)
        .chatWithToolsStream(messages, tools, systemPrompt, execute, undefined, webSearch, { functionCallLimits: { maxFunctionCalls: 12 }, enableThinking: true, traceId: null });
    }
    if (provider.type === "anthropic") return anthropicChatWithToolsStream(provider.baseUrl, provider.apiKey, modelName, messages, tools, systemPrompt, execute, signal, true, plugin.settings.proxyUrl, plugin.settings.proxyBypass, webSearch, { settings: plugin.settings.webSearch, maxCalls: plugin.settings.maxFunctionCalls });
    return openaiChatWithToolsStream(provider.baseUrl, provider.apiKey, modelName, messages, tools, systemPrompt, execute, signal, true, plugin.settings.proxyUrl, plugin.settings.proxyBypass, webSearch, undefined, undefined, { settings: plugin.settings.webSearch, maxCalls: plugin.settings.maxFunctionCalls });
  }
  if (isLocalLlmModel(model)) {
    const config = getLocalLlmConfig(model, plugin.settings);
    if (!config) throw new Error(`Local model not configured: ${model}`);
    return localLlmChatStream(config, messages, systemPrompt, signal);
  }
  const basePath = (plugin.app.vault.adapter as unknown as { basePath?: string }).basePath || ".";
  if (model === "codex-cli") return new CodexCliProvider(plugin.settings.cliConfig.codexCliModel, plugin.settings.cliConfig.codexCliPath, undefined, plugin.settings.cliConfig.codexCliReasoningEffort).chatStream(messages, systemPrompt, basePath, signal);
  if (model === "claude-cli") return new ClaudeCliProvider().chatStream(messages, systemPrompt, basePath, signal);
  return new AntigravityCliProvider(plugin.settings.cliConfig.geminiCliPath).chatStream(messages, systemPrompt, basePath, signal);
}

async function generate(plugin: LlmHubPlugin, modelId: string, prompt: string | Message[], systemPrompt: string, signal?: AbortSignal, vaultRead = false, webSearch = false, extra?: ExtraTools): Promise<string> {
  const model = modelId as ModelType;
  if (isImageGenerationModel(model)) throw new Error("Select a text model first.");
  const messages: Message[] = typeof prompt === "string" ? [{ role: "user", content: prompt, timestamp: Date.now() }] : prompt;
  const stream = vaultRead || webSearch || extra?.tools.length
    ? toolStream(plugin, model, messages, systemPrompt, signal, vaultRead, webSearch, extra)
    : streamChatForModel(model, messages, systemPrompt, plugin.settings, signal);
  let output = "";
  for await (const chunk of stream) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (chunk.type === "text" && chunk.content) output += chunk.content;
    else if (chunk.type === "tool_call") output = "";
    else if (chunk.type === "error") throw new Error(chunk.error || "AI generation failed.");
  }
  if (!output.trim()) throw new Error("AI returned an empty response.");
  return output.trim();
}

export async function generateDashboardBase(plugin: LlmHubPlugin, request: DashboardBaseRequest): Promise<string> {
  const { prompt, systemPrompt } = dashboardBasePrompt(request, loadBuiltinSkill(builtinFolderPath("base")));
  return stripYamlFence(await generate(plugin, request.modelId, prompt, systemPrompt, request.abortSignal, request.allowVaultRead));
}

export function rewriteDashboardText(plugin: LlmHubPlugin, request: DashboardRewriteRequest): Promise<string> {
  const { prompt, systemPrompt } = dashboardRewritePrompt(request);
  return generate(plugin, request.modelId, prompt, systemPrompt, request.abortSignal, false);
}

export function generateDashboardWorkflow(plugin: LlmHubPlugin, request: DashboardWorkflowGenerationRequest): Promise<string> {
  const { prompt, systemPrompt } = dashboardWorkflowPrompt(request, WORKFLOW_SPECIFICATION);
  return generate(plugin, request.modelId, prompt, systemPrompt, request.abortSignal, request.allowVaultRead);
}

export async function getDashboardTimelineOptions(plugin: LlmHubPlugin, modelId: string): Promise<DashboardTimelineAnswerOptions> {
  const model = modelId as ModelType;
  return {
    // Read-only Vault tools are wired only for API provider models; local and CLI models answer without them.
    vaultRead: isApiProviderModel(model),
    webSearch: modelSupportsWebSearch(model, plugin.settings.apiProviders, plugin.settings.webSearch),
    ragSettings: plugin.getRagSettingNames().filter((name) => plugin.getRagSearchSetting(name) !== null),
    // MCP tools need the same tool-calling path as the Vault tools.
    mcpServers: isApiProviderModel(model) ? (plugin.settings.mcpServers ?? []).map((server) => server.name) : [],
    skills: await listDashboardSkills(plugin.app, plugin.settings.skillsFolder),
  };
}

export async function answerDashboardTimeline(plugin: LlmHubPlugin, request: DashboardTimelineAnswerRequest): Promise<string> {
  const options = await getDashboardTimelineOptions(plugin, request.modelId);
  assertTimelineAnswerSupported(request, options);
  const vaultRead = request.allowVaultRead === true && options.vaultRead;
  let ragContext: string | undefined;
  if (request.ragSetting) {
    const setting = plugin.getRagSearchSetting(request.ragSetting);
    if (!setting) throw new Error(`RAG setting "${request.ragSetting}" was not found.`);
    // Retrieval runs up front so it works for every model, including ones without tool calling.
    ragContext = (await searchLocalRag(request.ragSetting, request.question, setting, getGeminiApiKey(plugin.settings),
      plugin.settings.proxyUrl, plugin.settings.proxyBypass, plugin.settings)).context;
  }
  // MCP calls go through the shared executor, which asks for approval like Chat does.
  const mcp = await createMcpToolset(options.mcpServers.length > 0
    ? (plugin.settings.mcpServers ?? []).filter((server) => request.mcpServers?.includes(server.name))
    : []);
  // Skills work as in Chat: API models get the skill tools, while CLI and local
  // models are told to emit [READ_SKILL] / [RUN_WORKFLOW] / [RUN_SCRIPT] markers.
  const skills = await loadDashboardSkills(plugin.app, plugin.settings.skillsFolder, request.skills);
  const markerMode = !isApiProviderModel(request.modelId as ModelType);
  const systemPrompt = timelineAnswerSystemPrompt({
    vaultRead, ragContext, mcp: mcp !== null,
    skillPrompt: buildSkillSystemPrompt(skills, { cliMode: markerMode }), additionalInstructions: plugin.settings.systemPrompt,
  });
  const messages = timelineAnswerMessages(request);
  if (markerMode) return answerWithSkillMarkers(plugin, request.modelId, messages, systemPrompt, skills, request.abortSignal);

  const scripts = collectSkillScripts(skills);
  const skillTools = createSkillToolset(plugin.app, skills, {
    vaultToolAllowedFolders: plugin.settings.cloudVaultToolAllowedFolders,
    readSkillMarker: true,
    runScript: (scriptId, argsJson) => executeSkillScript(plugin, scriptId, argsJson, scripts),
  });
  const extra: ExtraTools = {
    tools: [...(mcp?.tools ?? []), ...skillTools.tools],
    execute: async (name, args) => {
      if (skillTools.has(name)) return skillTools.execute(name, args);
      if (mcp?.has(name)) return mcp.execute(name, args);
      return { error: `Unknown tool: ${name}` };
    },
  };
  try {
    return await generate(plugin, request.modelId, messages, systemPrompt, request.abortSignal, vaultRead, request.webSearch === true, extra);
  } finally {
    await mcp?.cleanup();
  }
}

/** Chat's CLI / Local-LLM agent loop: run the markers a reply emits and feed the results back. */
async function answerWithSkillMarkers(plugin: LlmHubPlugin, modelId: string, messages: Message[], systemPrompt: string, skills: LoadedSkill[], signal?: AbortSignal): Promise<string> {
  let history = messages;
  let answer = "";
  for (let iteration = 0; iteration < MAX_MARKER_AGENT_ITERATIONS; iteration += 1) {
    const reply = await generate(plugin, modelId, history, systemPrompt, signal);
    const markers = await runSkillMarkers(plugin, reply, skills, signal, { vaultToolAllowedFolders: plugin.settings.cloudVaultToolAllowedFolders });
    answer += (answer && markers.processedContent ? "\n\n" : "") + markers.processedContent;
    if (markers.aborted || !markers.followUpMessage) break;
    history = [...history,
      { role: "assistant", content: reply, timestamp: Date.now() },
      { role: "user", content: markers.followUpMessage, timestamp: Date.now() }];
  }
  return answer;
}
