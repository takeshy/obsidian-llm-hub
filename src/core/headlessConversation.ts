import { App } from "obsidian";
import type { LlmHubPlugin } from "../plugin";
import type { Message, ToolDefinition, ModelType, ProviderContinuation, WebSearchCitation, WebSearchSource } from "../types";
import { isApiProviderModel, getApiProviderId, getApiProviderModelName, getDefaultModel, getGeminiApiKey, isLocalLlmModel, getLocalLlmConfig, SKILLS_FOLDER } from "../types";
import { getEnabledVaultTools } from "obsidian-llm-hub-common/core";
import { HOST_EXECUTES_RAG_SYNC_STATUS } from "src/vault/toolExecutor";
import { readSkillTool, skillScriptTool, skillWorkflowTool, executeReadSkillTool, READ_SKILL_TOOL_NAME } from "./skillTools";
import { GET_WORKFLOW_SPEC_TOOL, GET_WORKFLOW_SPEC_TOOL_NAME, handleGetWorkflowSpec } from "../workflow/workflowSpec";
import { createToolExecutor } from "../vault/toolExecutor";
import { discoverSkills, loadSkill, buildSkillSystemPrompt, collectSkillScripts, collectSkillWorkflows, type LoadedSkill, type SkillScriptRef, type SkillWorkflowRef } from "./skillsLoader";
import { getInterpreter, runScript } from "./scriptRunner";
import { parseWorkflowFromMarkdown } from "../workflow/parser";
import { WorkflowExecutor } from "../workflow/executor";
import type { PromptCallbacks } from "../workflow/types";
import type { EditConfirmationResult } from "../ui/components/workflow/EditConfirmationModal";
import { TFile } from "obsidian";
import { openaiChatWithToolsStream } from "./openaiProvider";
import { anthropicChatWithToolsStream } from "./anthropicProvider";
import { GeminiClient, getGeminiClient } from "./gemini";
import { localLlmChatStream } from "./localLlmProvider";
import { AntigravityCliProvider, ClaudeCliProvider, CodexCliProvider } from "./cliProvider";
import { searchLocalRag } from "./localRagStore";
import { formatError } from "obsidian-llm-hub-common/core";
import { formatWebSearchCitations, modelSupportsWebSearch } from "./webSearch";
import {
	getPendingEdit,
	applyEdit,
	discardEdit,
	getPendingDelete,
	applyDelete,
	discardDelete,
	getPendingRename,
	applyRename,
	discardRename,
	getPendingBulkEdit,
	applyBulkEdit,
	getPendingBulkDelete,
	applyBulkDelete,
	getPendingBulkRename,
	applyBulkRename,
} from "../vault/notes";

export interface HeadlessConversation {
  messages: Message[];
  lastActivity: number;
  model: ModelType | null;       // Per-channel model override
  ragSetting: string | null;     // Per-channel RAG setting name
  webSearch: boolean;            // Per-channel native web search toggle
  activeSkillPaths: string[];    // Active folder skill paths
  lastInteractionId?: string;    // Interactions API chaining (Gemini only)
  cliSession?: {
    provider: "antigravity-cli" | "claude-cli" | "codex-cli";
    sessionId: string;
  };
}

export interface GeneratedResponse {
  content: string;
  webSearchUsed?: boolean;
  webSearchSources?: WebSearchSource[];
  providerContinuation?: ProviderContinuation;
}

/** Model execution shared by external transports; owns no connection or credentials. */
export class HeadlessConversationRunner {
  constructor(private app: App, private plugin: LlmHubPlugin,
    private options: { model: string; systemPrompt: string; vaultFolders?: string[]; ragQuery?: string }, private signal: AbortSignal) {}
  private checkActive(): void { if (this.signal.aborted) throw new Error("Conversation cancelled"); }
  async generate(conversation: HeadlessConversation): Promise<GeneratedResponse> {
    this.checkActive();
    const settings = this.plugin.settings;
    const options = this.options;
    const messages = conversation.messages;

    // Resolve model: per-channel > discord setting > default
    const model: ModelType = conversation.model
      || (options.model ? (options.model as ModelType) : null)
      || getDefaultModel(settings);

    const scoped = options.vaultFolders !== undefined;
    if (scoped && !isApiProviderModel(model)) throw new Error("Scoped conversations require an API model");

    // Build system prompt
    let systemPrompt = options.systemPrompt || settings.systemPrompt ||
      "You are a helpful AI assistant in an external conversation. Be concise and helpful.";

    // RAG context injection
    const ragSettingName = conversation.ragSetting;
    if (ragSettingName) {
      const ragSetting = this.plugin.getRagSearchSetting(ragSettingName);
      if (ragSetting) {
        const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
        if (lastUserMsg?.content || options.ragQuery) {
          try {
            const ragResult = await searchLocalRag(
              ragSettingName, options.ragQuery || lastUserMsg!.content,
              ragSetting, getGeminiApiKey(settings),
              this.plugin.settings.proxyUrl, this.plugin.settings.proxyBypass, this.plugin.settings
            );
            if (ragResult.sources.length > 0) {
              systemPrompt += ragResult.context;
            }
          } catch (e) {
            console.error("LLM Hub: Discord RAG search failed:", formatError(e));
          }
        }
      }
    }

    // Load active folder skills
    const loadedSkills: LoadedSkill[] = [];
    const activeSkillPaths = conversation.activeSkillPaths || [];
    if (activeSkillPaths.length > 0) {
      const allSkills = await discoverSkills(this.app, this.plugin.settings.skillsFolder || SKILLS_FOLDER);
      for (const path of activeSkillPaths) {
        const meta = allSkills.find(s => s.folderPath === path);
        if (meta) {
          loadedSkills.push(loadSkill(this.app, meta));
        }
      }
    }

    // Route to correct provider
    const isCliModel = model === "antigravity-cli" || model === "claude-cli" || model === "codex-cli";

    // Inject skill system prompt
    if (loadedSkills.length > 0) {
      systemPrompt += buildSkillSystemPrompt(loadedSkills, { cliMode: isCliModel || isLocalLlmModel(model) });
    }

    // Build vault tools
    const tools = getEnabledVaultTools({ allowWrite: !scoped, allowDelete: !scoped, ragSyncStatus: HOST_EXECUTES_RAG_SYNC_STATUS });

    if (scoped && options.vaultFolders?.length === 0) tools.length = 0;

    // Add skill tools if any active skill has scripts/workflows
    const scriptMap = collectSkillScripts(scoped ? [] : loadedSkills);
    const workflowMap = collectSkillWorkflows(scoped ? [] : loadedSkills);
    if (loadedSkills.some(skill => !skill.instructions)) {
      tools.push(readSkillTool);
    }
    if (scriptMap.size > 0) {
      tools.push(skillScriptTool);
    }
    if (workflowMap.size > 0) {
      tools.push(skillWorkflowTool);
    }
    if (!scoped) tools.push(GET_WORKFLOW_SPEC_TOOL);

    const toolExecutor = createToolExecutor(this.app, {
      listNotesLimit: settings.listNotesLimit,
      maxNoteChars: settings.maxNoteChars,
      limitVaultToolScope: scoped || !isCliModel,
      vaultToolAllowedFolders: options.vaultFolders ?? settings.cloudVaultToolAllowedFolders,
    });

    const vaultBasePath = (this.app.vault.adapter as { basePath?: string }).basePath || ".";

    const baseExecuteToolCall = async (name: string, args: Record<string, unknown>) => {
      this.checkActive();
      if (!tools.some(tool => tool.name === name)) return { error: "Tool is not permitted for this conversation" };
      if (name === READ_SKILL_TOOL_NAME) {
        return await executeReadSkillTool(this.app, loadedSkills, args.skillName as string);
      }
      if (name === "run_skill_script" && scriptMap.size > 0) {
        return await this.executeSkillScript(
          args.scriptId as string, args.args as string | undefined, scriptMap, vaultBasePath,
        );
      }
      if (name === "run_skill_workflow" && workflowMap.size > 0) {
        return await this.executeSkillWorkflow(
          args.workflowId as string, args.variables as string | undefined, workflowMap,
          !isCliModel
            ? { vaultToolAllowedFolders: settings.cloudVaultToolAllowedFolders }
            : undefined,
        );
      }
      if (name === GET_WORKFLOW_SPEC_TOOL_NAME) {
        return handleGetWorkflowSpec(args, this.plugin);
      }
      return await toolExecutor(name, args);
    };

    // Wrap tool executor to auto-apply propose_edit/propose_delete/rename (headless execution)
    const executeToolCall = async (name: string, args: Record<string, unknown>) => {
      const prevPendingEdit = getPendingEdit();
      const prevPendingDelete = getPendingDelete();
      const prevPendingRename = getPendingRename();
      const prevPendingBulkEdit = getPendingBulkEdit();
      const prevPendingBulkDelete = getPendingBulkDelete();
      const prevPendingBulkRename = getPendingBulkRename();
      const result = await baseExecuteToolCall(name, args) as Record<string, unknown>;
      const toolCallFailed = result.error !== undefined || result.success === false;

      if (name === "propose_edit") {
        const pending = getPendingEdit();
        const hasNewPending = pending && pending.createdAt !== prevPendingEdit?.createdAt;
        if (hasNewPending && !toolCallFailed) {
          const applyResult = await applyEdit(this.app);
          if (applyResult.success) {
            return { ...result, applied: true, message: `Applied changes to "${pending.originalPath}"` };
          } else {
            discardEdit(this.app);
            return { ...result, applied: false, error: applyResult.error };
          }
        }
      }

      if (name === "propose_delete") {
        const pending = getPendingDelete();
        const hasNewPending = pending && pending.createdAt !== prevPendingDelete?.createdAt;
        if (hasNewPending && !toolCallFailed) {
          const deleteResult = await applyDelete(this.app);
          if (deleteResult.success) {
            return { ...result, deleted: true, message: `Deleted "${pending.path}"` };
          } else {
            discardDelete(this.app);
            return { ...result, deleted: false, error: deleteResult.error };
          }
        }
      }

      if (name === "rename_note") {
        const pendingRn = getPendingRename();
        const hasNewPending = pendingRn && pendingRn.createdAt !== prevPendingRename?.createdAt;
        if (hasNewPending && !toolCallFailed) {
          const renameResult = await applyRename(this.app);
          if (renameResult.success) {
            return { ...result, applied: true, message: `Renamed "${pendingRn.originalPath}" to "${pendingRn.newPath}"` };
          } else {
            discardRename(this.app);
            return { ...result, applied: false, error: renameResult.error };
          }
        }
      }

      if (name === "bulk_propose_edit") {
        const pendingBulk = getPendingBulkEdit();
        const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkEdit?.createdAt;
        if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
          const allPaths = pendingBulk.items.map(i => i.path);
          const applyResult = await applyBulkEdit(this.app, allPaths);
          return { ...result, applied: applyResult.applied, failed: applyResult.failed, message: applyResult.message };
        }
      }

      if (name === "bulk_propose_delete") {
        const pendingBulk = getPendingBulkDelete();
        const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkDelete?.createdAt;
        if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
          const allPaths = pendingBulk.items.map(i => i.path);
          const deleteResult = await applyBulkDelete(this.app, allPaths);
          return { ...result, deleted: deleteResult.deleted, failed: deleteResult.failed, message: deleteResult.message };
        }
      }

      if (name === "bulk_propose_rename") {
        const pendingBulk = getPendingBulkRename();
        const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkRename?.createdAt;
        if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
          const allPaths = pendingBulk.items.map(i => i.originalPath);
          const renameResult = await applyBulkRename(this.app, allPaths);
          return { ...result, applied: renameResult.applied, failed: renameResult.failed, message: renameResult.message };
        }
      }

      return result;
    };

    if (isCliModel) {
      conversation.lastInteractionId = undefined;
      const cliProvider = model;
      const existingSessionId = conversation.cliSession?.provider === cliProvider
        ? conversation.cliSession.sessionId
        : undefined;
      const generated = await this.generateViaCli(
        model, messages, systemPrompt, scriptMap, workflowMap, vaultBasePath, existingSessionId,
      );
      conversation.cliSession = generated.sessionId
        ? { provider: cliProvider, sessionId: generated.sessionId }
        : undefined;
      return { content: generated.content };
    }

    conversation.cliSession = undefined;

    if (isLocalLlmModel(model)) {
      conversation.lastInteractionId = undefined;
      return { content: await this.generateViaLocalLlm(model, messages, systemPrompt, scriptMap, workflowMap, vaultBasePath) };
    }

    const webSearchEnabled = conversation.webSearch && modelSupportsWebSearch(model, settings.apiProviders);

    if (isApiProviderModel(model)) {
      const providerId = getApiProviderId(model);
      const providerConfig = this.plugin.settings.apiProviders.find(
        p => p.id === providerId && p.enabled && p.verified
      );
      // Gemini-type API providers use Interactions API chaining
      if (providerConfig?.type === "gemini") {
        const { response, interactionId } = await this.generateViaGemini(
          messages, tools, systemPrompt, executeToolCall,
          getApiProviderModelName(model) || providerConfig.enabledModels[0] || "",
          false,
          conversation.lastInteractionId,
          webSearchEnabled,
        );
        conversation.lastInteractionId = interactionId;
        return { content: response, webSearchUsed: webSearchEnabled || undefined };
      }
      conversation.lastInteractionId = undefined;
      return await this.generateViaApiProvider(model, messages, tools, systemPrompt, executeToolCall, webSearchEnabled);
    }

    // Default: Gemini
    const { response, interactionId } = await this.generateViaGemini(
      messages, tools, systemPrompt, executeToolCall,
      undefined, undefined,
      conversation.lastInteractionId,
      webSearchEnabled,
    );
    conversation.lastInteractionId = interactionId;
    return { content: response, webSearchUsed: webSearchEnabled || undefined };
  }

  private async generateViaCli(
    model: ModelType,
    messages: Message[],
    systemPrompt: string,
    scriptMap: Map<string, { skill: LoadedSkill; scriptRef: SkillScriptRef; vaultPath: string }>,
    workflowMap: Map<string, { skill: LoadedSkill; workflowRef: SkillWorkflowRef; vaultPath: string }>,
    vaultBasePath: string,
    sessionId?: string,
  ): Promise<{ content: string; sessionId?: string }> {
    const cliConfig = this.plugin.settings.cliConfig;
    const provider = model === "claude-cli"
      ? new ClaudeCliProvider()
      : model === "codex-cli"
        ? new CodexCliProvider(cliConfig.codexCliModel, cliConfig.codexCliPath, undefined, cliConfig.codexCliReasoningEffort)
        : new AntigravityCliProvider(cliConfig.geminiCliPath);

    let fullResponse = "";
    let receivedSessionId: string | undefined;
    const stream = provider.chatStream(messages, systemPrompt, vaultBasePath, this.signal, sessionId);
    for await (const chunk of stream) {
      this.checkActive();
      if (chunk.type === "text") fullResponse += chunk.content;
      else if (chunk.type === "session_id" && chunk.sessionId) receivedSessionId = chunk.sessionId;
      else if (chunk.type === "error") throw new Error(chunk.error);
    }

    // Process text markers from CLI response
    fullResponse = await this.processTextMarkers(fullResponse, scriptMap, workflowMap, vaultBasePath);

    return {
      content: fullResponse,
      // Antigravity does not emit an ID; any truthy sentinel enables --continue.
      sessionId: receivedSessionId || sessionId || (model === "antigravity-cli" ? "__continue__" : undefined),
    };
  }

  private async generateViaApiProvider(
    model: ModelType,
    messages: Message[],
    tools: ToolDefinition[],
    systemPrompt: string,
    executeToolCall: (name: string, args: Record<string, unknown>) => Promise<unknown>,
    webSearchEnabled?: boolean,
  ): Promise<GeneratedResponse> {
    const providerId = getApiProviderId(model);
    const providerConfig = this.plugin.settings.apiProviders.find(
      p => p.id === providerId && p.enabled && p.verified
    );
    if (!providerConfig) throw new Error("No enabled API provider configured");

    const modelName = getApiProviderModelName(model) || providerConfig.enabledModels[0] || "";
    const enableThinking = false;

    // For Gemini-type API providers, fall through to Gemini client
    // (normally handled in generateResponse for Interactions API chaining, but kept as safety fallback)
    if (providerConfig.type === "gemini") {
      const { response } = await this.generateViaGemini(messages, tools, systemPrompt, executeToolCall, modelName, enableThinking);
      return { content: response, webSearchUsed: webSearchEnabled || undefined };
    }

    const streamFn = providerConfig.type === "anthropic"
      ? anthropicChatWithToolsStream(
          providerConfig.baseUrl, providerConfig.apiKey,
          modelName, messages, tools,
          systemPrompt, executeToolCall,
          this.signal,
          enableThinking,
          this.plugin.settings.proxyUrl, this.plugin.settings.proxyBypass,
          webSearchEnabled,
        )
      : openaiChatWithToolsStream(
          providerConfig.baseUrl, providerConfig.apiKey,
          modelName, messages, tools,
          systemPrompt, executeToolCall,
          this.signal,
          enableThinking,
          this.plugin.settings.proxyUrl, this.plugin.settings.proxyBypass,
          webSearchEnabled,
        );

    let fullResponse = "";
    let webSearchUsed = false;
    let citations: WebSearchCitation[] = [];
    let directSources: WebSearchSource[] = [];
    let providerContinuation: ProviderContinuation | undefined;
    for await (const chunk of streamFn) {
      this.checkActive();
      if (chunk.type === "text") fullResponse += chunk.content;
      else if (chunk.type === "web_search_used") webSearchUsed = true;
      else if (chunk.type === "error") throw new Error(chunk.error || "Unknown API error");
      else if (chunk.type === "done") {
        citations = chunk.webSearchCitations ?? [];
        directSources = chunk.webSearchSources ?? [];
        providerContinuation = chunk.providerContinuation;
        break;
      }
    }
    const formatted = directSources.length > 0
      ? { content: fullResponse, sources: directSources }
      : formatWebSearchCitations(fullResponse, citations);
    return {
      content: formatted.content,
      webSearchUsed: webSearchUsed || undefined,
      webSearchSources: formatted.sources.length > 0 ? formatted.sources : undefined,
      providerContinuation,
    };
  }

  private async generateViaLocalLlm(
    model: string,
    messages: Message[],
    systemPrompt: string,
    scriptMap: Map<string, { skill: LoadedSkill; scriptRef: SkillScriptRef; vaultPath: string }>,
    workflowMap: Map<string, { skill: LoadedSkill; workflowRef: SkillWorkflowRef; vaultPath: string }>,
    vaultBasePath: string,
  ): Promise<string> {
    const llmConfig = getLocalLlmConfig(model, this.plugin.settings);
    if (!llmConfig || !llmConfig.verified || !llmConfig.model) {
      throw new Error(`Local LLM "${model}" is not configured or not verified`);
    }

    const localSystemPrompt = [
      "You are a helpful AI assistant in an external conversation.",
      "You are running in Local LLM mode with limited capabilities.",
      "Do not claim that you can open, search, or modify vault files unless their contents are already included in the conversation.",
      `Vault location: ${vaultBasePath}`,
      systemPrompt,
    ].join("\n\n");

    let fullResponse = "";
    for await (const chunk of localLlmChatStream(llmConfig, messages, localSystemPrompt, this.signal)) {
      if (chunk.type === "text") fullResponse += chunk.content || "";
      else if (chunk.type === "error") throw new Error(chunk.error || "Unknown local LLM error");
      else if (chunk.type === "done") break;
    }

    // Process text markers from response
    fullResponse = await this.processTextMarkers(fullResponse, scriptMap, workflowMap, vaultBasePath, {
      vaultToolAllowedFolders: this.plugin.settings.cloudVaultToolAllowedFolders,
    });

    return fullResponse;
  }

  private async generateViaGemini(
    messages: Message[],
    tools: ToolDefinition[],
    systemPrompt: string,
    executeToolCall: (name: string, args: Record<string, unknown>) => Promise<unknown>,
    modelOverride?: string,
    enableThinking?: boolean,
    previousInteractionId?: string,
    webSearchEnabled?: boolean,
  ): Promise<{ response: string; interactionId?: string }> {
    // Use a separate client instance to avoid race conditions with the shared singleton
    let client: GeminiClient;
    if (modelOverride) {
      const apiKey = getGeminiApiKey(this.plugin.settings);
      if (!apiKey) throw new Error("Gemini API key not configured");
      client = new GeminiClient(apiKey, modelOverride as ModelType, this.plugin.settings.proxyUrl, this.plugin.settings.proxyBypass);
    } else {
      const shared = getGeminiClient();
      if (!shared) throw new Error("Gemini client not initialized");
      client = shared;
    }

    let fullResponse = "";
    let interactionId: string | undefined;
    const stream = client.chatWithToolsStream(
      messages, tools, systemPrompt, executeToolCall, undefined,
      webSearchEnabled,
      { enableThinking, previousInteractionId },
    );
    for await (const chunk of stream) {
      this.checkActive();
      if (chunk.type === "text") fullResponse += chunk.content;
      else if (chunk.type === "error") throw new Error(chunk.error || "Unknown Gemini error");
      else if (chunk.type === "done") {
        interactionId = chunk.interactionId;
        break;
      }
    }
    return { response: fullResponse, interactionId };
  }

  // ========================================
  // Skill Text Marker Processing (CLI/Local LLM)
  // ========================================

  private async processTextMarkers(
    content: string,
    scriptMap: Map<string, { skill: LoadedSkill; scriptRef: SkillScriptRef; vaultPath: string }>,
    workflowMap: Map<string, { skill: LoadedSkill; workflowRef: SkillWorkflowRef; vaultPath: string }>,
    vaultBasePath: string,
    options?: {
      vaultToolAllowedFolders?: string[];
    },
  ): Promise<string> {
    this.checkActive();
    let result = content;

    // Process [RUN_SCRIPT: id](args)
    if (scriptMap.size > 0) {
      const scriptRegex = /\[RUN_SCRIPT:\s*(.+?)\](?:\(([\s\S]*?)\))?/g;
      let match;
      while ((match = scriptRegex.exec(content)) !== null) {
        const scriptResult = await this.executeSkillScript(match[1].trim(), match[2]?.trim(), scriptMap, vaultBasePath);
        result = result.replace(match[0], `**Script: ${match[1].trim()}**\n\`\`\`json\n${JSON.stringify(scriptResult, null, 2)}\n\`\`\``);
      }
    }

    // Process [RUN_WORKFLOW: id](variables)
    if (workflowMap.size > 0) {
      const workflowRegex = /\[RUN_WORKFLOW:\s*(.+?)\](?:\(([\s\S]*?)\))?/g;
      let match;
      while ((match = workflowRegex.exec(content)) !== null) {
        const wfResult = await this.executeSkillWorkflow(match[1].trim(), match[2]?.trim(), workflowMap, options);
        result = result.replace(match[0], `**Workflow: ${match[1].trim()}**\n\`\`\`json\n${JSON.stringify(wfResult, null, 2)}\n\`\`\``);
      }
    }

    return result;
  }

  private async executeSkillScript(
    scriptId: string,
    argsJson: string | undefined,
    scriptMap: Map<string, { skill: LoadedSkill; scriptRef: SkillScriptRef; vaultPath: string }>,
    vaultBasePath: string,
  ): Promise<Record<string, unknown>> {
    this.checkActive();
    const entry = scriptMap.get(scriptId);
    if (!entry) {
      const available = [...scriptMap.keys()].join(", ");
      return { error: `Unknown script ID: ${scriptId}. Available: ${available}` };
    }

    if (
      !entry.scriptRef.path.startsWith("scripts/") ||
      entry.scriptRef.path.startsWith("/") ||
      entry.scriptRef.path.includes("\\") ||
      entry.scriptRef.path.split("/").includes("..")
    ) {
      return { error: "Skill scripts must be located under the scripts/ directory" };
    }

    let scriptArgs: string[] = [];
    if (argsJson) {
      try {
        const parsed = JSON.parse(argsJson) as unknown;
        if (Array.isArray(parsed)) {
          scriptArgs = parsed.map(String);
        }
      } catch {
        return { error: `Invalid args JSON: ${argsJson}` };
      }
    }

    const absoluteScriptPath = `${vaultBasePath}/${entry.vaultPath}`;
    const skillDir = `${vaultBasePath}/${entry.skill.folderPath}`;

    const interpreter = getInterpreter(absoluteScriptPath);
    let command: string;
    let commandArgs: string[];
    if (interpreter) {
      command = interpreter.command;
      commandArgs = [...interpreter.args, ...scriptArgs];
    } else {
      command = absoluteScriptPath;
      commandArgs = scriptArgs;
    }

    const result = await runScript({
      command,
      args: commandArgs,
      cwd: skillDir,
      env: {
        SKILL_DIR: skillDir,
        VAULT_PATH: vaultBasePath,
      },
    });
    return { ...result };
  }

  private async executeSkillWorkflow(
    workflowId: string,
    variablesJson: string | undefined,
    workflowMap: Map<string, { skill: LoadedSkill; workflowRef: SkillWorkflowRef; vaultPath: string }>,
    options?: {
      vaultToolAllowedFolders?: string[];
    },
  ): Promise<Record<string, unknown>> {
    this.checkActive();
    const entry = workflowMap.get(workflowId);
    if (!entry) {
      const available = [...workflowMap.keys()].join(", ");
      return { error: `Unknown workflow ID: ${workflowId}. Available: ${available}` };
    }

    const file = this.app.vault.getAbstractFileByPath(entry.vaultPath);
    if (!(file instanceof TFile)) {
      return { error: `Workflow file not found: ${entry.vaultPath}` };
    }

    const content = await this.app.vault.read(file);

    let workflow;
    try {
      workflow = parseWorkflowFromMarkdown(content);
    } catch (e) {
      return { error: `Failed to parse workflow: ${e instanceof Error ? e.message : String(e)}` };
    }

    const variables = new Map<string, string | number>();
    if (variablesJson) {
      try {
        const parsed = JSON.parse(variablesJson) as Record<string, string | number>;
        for (const [key, value] of Object.entries(parsed)) {
          variables.set(key, value);
        }
      } catch {
        return { error: `Invalid variables JSON: ${variablesJson}` };
      }
    }

    // Headless callbacks for external conversations (no UI interaction)
    const callbacks: PromptCallbacks = {
      promptForFile: () => Promise.resolve(null),
      promptForSelection: () => Promise.resolve(null),
      promptForValue: (_prompt: string, defaultValue?: string) => Promise.resolve(defaultValue || null),
      promptForConfirmation: () => Promise.resolve({ action: "save" } as EditConfirmationResult),
      promptForDialog: () => Promise.resolve(null),
    };

    const executor = new WorkflowExecutor(this.app);
    try {
      const result = await executor.execute(
        workflow,
        { variables },
        undefined,
        {
          workflowName: entry.vaultPath.substring(entry.vaultPath.lastIndexOf("/") + 1).replace(/\.md$/, "") || workflowId,
          vaultToolAllowedFolders: options?.vaultToolAllowedFolders,
        },
        callbacks,
      );

      // Collect output variables from execution context
      const outputVars: Record<string, string | number> = {};
      for (const [key, value] of result.context.variables) {
        if (!key.startsWith("_")) {
          outputVars[key] = value;
        }
      }

      // Check logs for errors
      const errorLog = result.context.logs.find(l => l.status === "error");
      return {
        success: !errorLog,
        variables: outputVars,
        ...(errorLog ? { error: errorLog.message } : {}),
      };
    } catch (e) {
      return { error: `Workflow execution failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

}
