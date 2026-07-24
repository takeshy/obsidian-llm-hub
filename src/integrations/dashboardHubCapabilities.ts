import { Platform, TFile } from "obsidian";
import type { LlmHubPlugin } from "src/plugin";
import { streamChatForModel } from "src/core/modelStreaming";
import { GeminiClient } from "src/core/gemini";
import { openaiChatWithToolsStream } from "src/core/openaiProvider";
import { anthropicChatWithToolsStream } from "src/core/anthropicProvider";
import { localLlmChatStream } from "src/core/localLlmProvider";
import { AntigravityCliProvider, ClaudeCliProvider, CodexCliProvider } from "src/core/cliProvider";
import { getEnabledTools } from "src/core/tools";
import { createToolExecutor } from "src/vault/toolExecutor";
import { loadBuiltinSkill, builtinFolderPath } from "src/core/builtinSkills";
import { WORKFLOW_SPECIFICATION } from "src/workflow/workflowSpec";
import {
  getApiProviderId, getApiProviderModelName, getGeminiApiKey, getLocalLlmConfig,
  isApiProviderModel, isImageGenerationModel, isLocalLlmModel,
  type Message, type ModelType, type StreamChunk,
} from "src/types";
import { parseWorkflowFromMarkdown } from "src/workflow/parser";
import { WorkflowExecutor } from "src/workflow/executor";
import type { PromptCallbacks, WorkflowInput } from "src/workflow/types";

export interface DashboardAiModel { id: string; name: string; capabilities: { text: boolean; vaultRead: boolean; tools: boolean } }
export interface DashboardWorkflowRequest { workflowPath: string; outputVariable?: string; abortSignal?: AbortSignal }
export interface DashboardBaseRequest { modelId: string; instruction: string; currentYaml?: string; basePath?: string; allowVaultRead: boolean; previousResult?: string; abortSignal?: AbortSignal }
export interface DashboardRewriteRequest { modelId: string; content: string; instruction: string; previousResult?: string; context: "timeline" | "memo"; abortSignal?: AbortSignal }
export interface DashboardWorkflowGenerationRequest { modelId: string; mode: "create" | "modify"; instruction: string; currentMarkdown?: string; previousResult?: string; outputContract: { outputVariable: string; format: "markdown" | "html" }; allowVaultRead: boolean; abortSignal?: AbortSignal }

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

function headlessCallbacks(): PromptCallbacks {
  return { promptForFile: () => Promise.resolve(null), promptForAnyFile: () => Promise.resolve(null), promptForNewFilePath: () => Promise.resolve(null),
    promptForSelection: () => Promise.resolve(null), promptForValue: () => Promise.resolve(null),
    promptForConfirmation: () => Promise.resolve({ confirmed: false }), promptForDialog: () => Promise.resolve(null), promptForPassword: () => Promise.resolve(null) };
}

function extractString(values: Map<string, string | number>, name?: string): string | null {
  const str = (value: unknown) => typeof value === "string" ? value : typeof value === "number" ? String(value) : null;
  if (name) return str(values.get(name));
  const result = str(values.get("result"));
  if (result != null) return result;
  for (const [key, value] of values) { const text = str(value); if (!key.startsWith("_") && text) return text; }
  return null;
}

export async function runDashboardWorkflow(plugin: LlmHubPlugin, request: DashboardWorkflowRequest): Promise<string> {
  const file = plugin.app.vault.getAbstractFileByPath(request.workflowPath);
  if (!(file instanceof TFile)) throw new Error(`Workflow not found: ${request.workflowPath}`);
  const workflow = parseWorkflowFromMarkdown(await plugin.app.vault.read(file));
  const input: WorkflowInput = { variables: new Map() };
  const execution = await new WorkflowExecutor(plugin.app, plugin).execute(workflow, input, undefined, {
    workflowPath: file.path, workflowName: file.basename, recordHistory: false,
    abortSignal: request.abortSignal ?? new AbortController().signal,
  }, headlessCallbacks());
  const text = extractString(execution.context.variables, request.outputVariable);
  if (text == null) throw new Error("Workflow output is not a string. Store it in `result`, or set Output variable.");
  return text;
}

function toolStream(plugin: LlmHubPlugin, model: ModelType, messages: Message[], systemPrompt: string, signal?: AbortSignal): AsyncGenerator<StreamChunk> {
  const tools = getEnabledTools({ allowWrite: false, allowDelete: false, ragEnabled: false });
  const execute = createToolExecutor(plugin.app, { listNotesLimit: plugin.settings.listNotesLimit, maxNoteChars: plugin.settings.maxNoteChars,
    limitVaultToolScope: true, cloudVaultToolAllowedFolders: plugin.settings.cloudVaultToolAllowedFolders });
  if (isApiProviderModel(model)) {
    const provider = plugin.settings.apiProviders.find((entry) => entry.id === getApiProviderId(model) && entry.enabled && entry.verified);
    if (!provider) throw new Error(`Provider not found for model: ${model}`);
    const modelName = getApiProviderModelName(model);
    if (provider.type === "gemini") {
      const key = provider.apiKey || getGeminiApiKey(plugin.settings);
      if (!key) throw new Error("Gemini API key is not configured.");
      return new GeminiClient(key, modelName as ModelType, plugin.settings.proxyUrl, plugin.settings.proxyBypass)
        .chatWithToolsStream(messages, tools, systemPrompt, execute, undefined, false, { functionCallLimits: { maxFunctionCalls: 12 }, enableThinking: true, traceId: null });
    }
    if (provider.type === "anthropic") return anthropicChatWithToolsStream(provider.baseUrl, provider.apiKey, modelName, messages, tools, systemPrompt, execute, signal, true, plugin.settings.proxyUrl, plugin.settings.proxyBypass);
    return openaiChatWithToolsStream(provider.baseUrl, provider.apiKey, modelName, messages, tools, systemPrompt, execute, signal, true, plugin.settings.proxyUrl, plugin.settings.proxyBypass);
  }
  if (isLocalLlmModel(model)) {
    const config = getLocalLlmConfig(model, plugin.settings);
    if (!config) throw new Error(`Local model not configured: ${model}`);
    return localLlmChatStream(config, messages, systemPrompt, signal);
  }
  const basePath = (plugin.app.vault.adapter as unknown as { basePath?: string }).basePath || ".";
  if (model === "codex-cli") return new CodexCliProvider().chatStream(messages, systemPrompt, basePath, signal);
  if (model === "claude-cli") return new ClaudeCliProvider().chatStream(messages, systemPrompt, basePath, signal);
  return new AntigravityCliProvider(plugin.settings.cliConfig.geminiCliPath).chatStream(messages, systemPrompt, basePath, signal);
}

async function generate(plugin: LlmHubPlugin, modelId: string, prompt: string, systemPrompt: string, signal?: AbortSignal, vaultRead = false): Promise<string> {
  const model = modelId as ModelType;
  if (isImageGenerationModel(model)) throw new Error("Select a text model first.");
  const messages: Message[] = [{ role: "user", content: prompt, timestamp: Date.now() }];
  const stream = vaultRead ? toolStream(plugin, model, messages, systemPrompt, signal) : streamChatForModel(model, messages, systemPrompt, plugin.settings, signal);
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

function stripFence(text: string): string { return text.replace(/^\s*```(?:ya?ml)?\s*/i, "").replace(/\s*```\s*$/, "").trim(); }
function baseSystemPrompt(): string {
  const skill = loadBuiltinSkill(builtinFolderPath("base"));
  const reference = skill ? `${skill.instructions}\n\n${skill.references.join("\n\n")}` : "";
  return `You author valid Obsidian Bases .base YAML. Return only YAML without fences. Use read-only Vault tools when available to verify real property names.\n\n${reference}`;
}

export async function generateDashboardBase(plugin: LlmHubPlugin, request: DashboardBaseRequest): Promise<string> {
  const source = request.previousResult || request.currentYaml;
  const prompt = source ? `Revise this Base according to the instruction.\nInstruction: ${request.instruction}\n\nCurrent YAML:\n${source}` : `Create an Obsidian Base.\nInstruction: ${request.instruction}`;
  return stripFence(await generate(plugin, request.modelId, prompt, baseSystemPrompt(), request.abortSignal, request.allowVaultRead));
}

export function rewriteDashboardText(plugin: LlmHubPlugin, request: DashboardRewriteRequest): Promise<string> {
  const source = request.previousResult || request.content;
  return generate(plugin, request.modelId, `Instruction: ${request.instruction}\n\nText to rewrite:\n${source}`,
    `Rewrite the ${request.context} text. Return only the rewritten text without explanation or fences.`, request.abortSignal, false);
}

export function generateDashboardWorkflow(plugin: LlmHubPlugin, request: DashboardWorkflowGenerationRequest): Promise<string> {
  const source = request.previousResult || request.currentMarkdown;
  const prompt = `${request.mode === "modify" ? "Revise" : "Create"} an unattended Obsidian Workflow.\nInstruction: ${request.instruction}\nOutput must be ${request.outputContract.format} in variable ${request.outputContract.outputVariable}.${source ? `\n\nCurrent workflow:\n${source}` : ""}`;
  return generate(plugin, request.modelId, prompt,
    `Return only a complete Markdown workflow document with a workflow YAML code block. Do not use interactive nodes.\n\n${WORKFLOW_SPECIFICATION}`,
    request.abortSignal, request.allowVaultRead);
}
