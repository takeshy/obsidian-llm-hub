import { App } from "obsidian";
import type { LlmHubPlugin } from "../../plugin";
import { GeminiClient, getGeminiClient } from "../../core/gemini";
import { PersistentCliSession } from "../../core/cliProvider";
import { isImageGenerationModel, isApiProviderModel, getApiProviderId, getApiProviderModelName, getGeminiApiKey, isLocalLlmModel, getLocalLlmConfig, normalizeDeprecatedModelIdentifier, type ToolDefinition, type McpAppInfo, type StreamChunkUsage } from "../../types";
import { getEnabledTools } from "../../core/tools";
import { fetchMcpTools, createMcpToolExecutor, type McpToolDefinition } from "../../core/mcpTools";
import { createToolExecutor } from "../../vault/toolExecutor";
import { WorkflowNode, ExecutionContext, PromptCallbacks, FileExplorerData } from "../types";
import { replaceVariables, setSystemVariable } from "./utils";
import { tracing } from "../../core/tracingHooks";
import { formatError } from "../../utils/error";
import { handleExecuteJavascriptTool, EXECUTE_JAVASCRIPT_TOOL } from "../../core/sandboxExecutor";
import { searchLocalRag, loadRagMediaAttachments } from "../../core/localRagStore";
import { openaiChatWithToolsStream } from "../../core/openaiProvider";
import { anthropicChatWithToolsStream } from "../../core/anthropicProvider";
import { localLlmChatStream } from "../../core/localLlmProvider";
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
} from "../../vault/notes";

// Wrap a tool executor to auto-apply propose_edit/propose_delete/rename (no UI in workflow)
function wrapToolExecutorWithAutoApply(
	baseExecutor: (name: string, args: Record<string, unknown>) => Promise<unknown>,
	app: App,
): (name: string, args: Record<string, unknown>) => Promise<unknown> {
	return async (name: string, args: Record<string, unknown>) => {
		const prevPendingEdit = getPendingEdit();
		const prevPendingDelete = getPendingDelete();
		const prevPendingRename = getPendingRename();
		const prevPendingBulkEdit = getPendingBulkEdit();
		const prevPendingBulkDelete = getPendingBulkDelete();
		const prevPendingBulkRename = getPendingBulkRename();
		const result = await baseExecutor(name, args) as Record<string, unknown>;
		const toolCallFailed = result.error !== undefined || result.success === false;

		if (name === "propose_edit") {
			const pending = getPendingEdit();
			const hasNewPending = pending && pending.createdAt !== prevPendingEdit?.createdAt;
			if (hasNewPending && !toolCallFailed) {
				const applyResult = await applyEdit(app);
				if (applyResult.success) {
					return { ...result, applied: true, message: `Applied changes to "${pending.originalPath}"` };
				} else {
					discardEdit(app);
					return { ...result, applied: false, error: applyResult.error };
				}
			}
		}

		if (name === "propose_delete") {
			const pending = getPendingDelete();
			const hasNewPending = pending && pending.createdAt !== prevPendingDelete?.createdAt;
			if (hasNewPending && !toolCallFailed) {
				const deleteResult = await applyDelete(app);
				if (deleteResult.success) {
					return { ...result, deleted: true, message: `Deleted "${pending.path}"` };
				} else {
					discardDelete(app);
					return { ...result, deleted: false, error: deleteResult.error };
				}
			}
		}

		if (name === "rename_note") {
			const pendingRn = getPendingRename();
			const hasNewPending = pendingRn && pendingRn.createdAt !== prevPendingRename?.createdAt;
			if (hasNewPending && !toolCallFailed) {
				const renameResult = await applyRename(app);
				if (renameResult.success) {
					return { ...result, applied: true, message: `Renamed "${pendingRn.originalPath}" to "${pendingRn.newPath}"` };
				} else {
					discardRename(app);
					return { ...result, applied: false, error: renameResult.error };
				}
			}
		}

		if (name === "bulk_propose_edit") {
			const pendingBulk = getPendingBulkEdit();
			const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkEdit?.createdAt;
			if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
				const allPaths = pendingBulk.items.map(i => i.path);
				const applyResult = await applyBulkEdit(app, allPaths);
				return { ...result, applied: applyResult.applied, failed: applyResult.failed, message: applyResult.message };
			}
		}

		if (name === "bulk_propose_delete") {
			const pendingBulk = getPendingBulkDelete();
			const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkDelete?.createdAt;
			if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
				const allPaths = pendingBulk.items.map(i => i.path);
				const deleteResult = await applyBulkDelete(app, allPaths);
				return { ...result, deleted: deleteResult.deleted, failed: deleteResult.failed, message: deleteResult.message };
			}
		}

		if (name === "bulk_propose_rename") {
			const pendingBulk = getPendingBulkRename();
			const hasNewPending = pendingBulk && pendingBulk.createdAt !== prevPendingBulkRename?.createdAt;
			if (hasNewPending && !toolCallFailed && pendingBulk.items.length > 0) {
				const allPaths = pendingBulk.items.map(i => i.originalPath);
				const renameResult = await applyBulkRename(app, allPaths);
				return { ...result, applied: renameResult.applied, failed: renameResult.failed, message: renameResult.message };
			}
		}

		return result;
	};
}

// Result type for command node execution
export interface CommandNodeResult {
  mcpAppInfo?: McpAppInfo;
  usedModel: string;
  usage?: StreamChunkUsage;
  elapsedMs?: number;
}

// Handle command node - execute LLM with prompt directly
export async function handleCommandNode(
  node: WorkflowNode,
  context: ExecutionContext,
  app: App,
  plugin: LlmHubPlugin,
  promptCallbacks?: PromptCallbacks,
  traceId?: string | null,
  abortSignal?: AbortSignal
): Promise<CommandNodeResult> {
  // Track collected MCP App info from tool executions
  let collectedMcpAppInfo: McpAppInfo | undefined;
  const promptTemplate = node.properties["prompt"];
  if (!promptTemplate) {
    throw new Error("Command node missing 'prompt' property");
  }

  // Replace variables in prompt
  let prompt = replaceVariables(promptTemplate, context);
  const originalPrompt = prompt; // Save for potential regeneration

  // Check if this is a regeneration request for this node
  if (context.regenerateInfo?.commandNodeId === node.id) {
    const info = context.regenerateInfo;
    prompt = `${info.originalPrompt}

[Previous output]
${info.previousOutput}

[User feedback]
${info.additionalRequest}

Please revise the output based on the user's feedback above.`;
    // Clear regenerate info after using it
    context.regenerateInfo = undefined;
  }

  // Get model (use node's model or current selection)
  const modelName = node.properties["model"] || "";
  let model = normalizeDeprecatedModelIdentifier(modelName || plugin.getSelectedModel()) as import("../../types").ModelType;
  let geminiProviderConfig: typeof plugin.settings.apiProviders[number] | null = null;

  // Check if this is a CLI model, Local LLM, or API provider
  let isCliModel = model === "antigravity-cli" || model === "claude-cli" || model === "codex-cli";
  let isLocalLlm = isLocalLlmModel(model);

  // If resolved model requires API key but none is configured, fall back to a
  // verified API provider, Local LLM, or CLI. Only when the node didn't
  // explicitly specify a non-fallback model.
  if (!isCliModel && !isLocalLlm && !isApiProviderModel(model) && !getGeminiApiKey(plugin.settings) && !modelName) {
    // Try API provider first
    const activeProvider = plugin.settings.apiProviders.find(p => p.enabled && p.verified && p.enabledModels.length > 0);
    if (activeProvider) {
      model = `api:${activeProvider.id}:${activeProvider.enabledModels[0]}` as import("../../types").ModelType;
    } else {
      const activeLocal = (plugin.settings.localLlmConfigs ?? []).find(c => c.verified && c.enabled !== false);
      const localFirstModel = activeLocal && (activeLocal.enabledModels?.[0] ?? activeLocal.model);
      if (activeLocal && localFirstModel) {
        model = `local-llm:${activeLocal.id}:${localFirstModel}` as import("../../types").ModelType;
        isLocalLlm = true;
      } else {
        const cliConfig = plugin.settings.cliConfig;
        if (cliConfig?.cliVerified) {
          model = "antigravity-cli";
        } else if (cliConfig?.claudeCliVerified) {
          model = "claude-cli";
        } else if (cliConfig?.codexCliVerified) {
          model = "codex-cli";
        } else {
          throw new Error("No API key, API provider, Local LLM, or verified CLI configured. Please set one up in settings.");
        }
        isCliModel = true;
      }
    }
  }
  const shouldLimitLlmVaultTools = !isCliModel;

  if (isCliModel) {
    // Use persistent CLI session (shared across workflow nodes)
    const providerName = (model === "claude-cli" ? "claude-cli" : model === "codex-cli" ? "codex-cli" : "antigravity-cli") as import("../../types").ChatProvider;

    // Get or create persistent CLI session from context
    if (!context.persistentCliSessions) {
      context.persistentCliSessions = new Map();
    }
    let session = context.persistentCliSessions.get(providerName);
    if (!session || !session.isAlive) {
      const vaultPath = (app.vault.adapter as { basePath?: string }).basePath || "";
      const cliConfig = plugin.settings.cliConfig;
      const customCliPath = providerName === "antigravity-cli"
        ? cliConfig?.geminiCliPath
        : providerName === "claude-cli"
          ? cliConfig?.claudeCliPath
          : cliConfig?.codexCliPath;
      session = new PersistentCliSession(providerName, vaultPath, customCliPath);
      session.start();
      context.persistentCliSessions.set(providerName, session);
    }

    // Build messages
    const messages = [
      {
        role: "user" as const,
        content: prompt,
        timestamp: Date.now(),
      },
    ];

    // Execute CLI call
    const genId = tracing.generationStart(traceId ?? null, "cli-command", {
      model,
      input: prompt,
      metadata: { provider: providerName },
    });

    let fullResponse = "";
    const cliStartTime = Date.now();

    try {
      for await (const chunk of session.sendMessage(prompt, messages, "", abortSignal)) {
        if (chunk.type === "text") {
          fullResponse += chunk.content;
        } else if (chunk.type === "error") {
          throw new Error(chunk.error);
        }
      }
      tracing.generationEnd(genId, { output: fullResponse });
    } catch (error) {
      tracing.generationEnd(genId, {
        error: formatError(error),
      });
      throw error;
    }

    // Save response to variable if specified
    const saveTo = node.properties["saveTo"];
    if (saveTo) {
      // Strip markdown code fences if the entire response is a single code block.
      let responseToSave = fullResponse;
      const trimmed = fullResponse.trim();
      const fenceMatch = trimmed.match(/^```\w*\r?\n([\s\S]+?)\r?\n```$/);
      if (fenceMatch && !fenceMatch[1].includes("```")) {
        responseToSave = fenceMatch[1];
      }
      context.variables.set(saveTo, responseToSave);
      // Save command info for potential regeneration
      context.lastCommandInfo = {
        nodeId: node.id,
        originalPrompt,
        saveTo,
      };
    }
    setSystemVariable(context, "_lastModel", model);
    return { usedModel: model, elapsedMs: Date.now() - cliStartTime };
  }

  // Local LLM model: route through localLlmChatStream (no tools/RAG —
  // workflow command nodes only need plain text generation, mirroring CLI).
  if (isLocalLlm) {
    const llmConfig = getLocalLlmConfig(model, plugin.settings);
    if (!llmConfig) {
      throw new Error(`Local LLM "${model}" is not configured or not verified. Set it up in settings.`);
    }

    const messages = [
      {
        role: "user" as const,
        content: prompt,
        timestamp: Date.now(),
      },
    ];

    const genId = tracing.generationStart(traceId ?? null, "local-llm-command", {
      model,
      input: prompt,
      metadata: { framework: llmConfig.framework, baseUrl: llmConfig.baseUrl, modelId: llmConfig.model },
    });

    const localStartTime = Date.now();
    let fullResponse = "";
    try {
      for await (const chunk of localLlmChatStream(llmConfig, messages, "", abortSignal)) {
        if (chunk.type === "text") {
          fullResponse += chunk.content ?? "";
        } else if (chunk.type === "error") {
          throw new Error(chunk.error || "Local LLM error");
        } else if (chunk.type === "done") {
          break;
        }
      }
      tracing.generationEnd(genId, { output: fullResponse });
    } catch (error) {
      tracing.generationEnd(genId, { error: formatError(error) });
      throw error;
    }

    // Save response to variable if specified (matches CLI branch semantics).
    const saveTo = node.properties["saveTo"];
    if (saveTo) {
      let responseToSave = fullResponse;
      const trimmed = fullResponse.trim();
      const fenceMatch = trimmed.match(/^```\w*\r?\n([\s\S]+?)\r?\n```$/);
      if (fenceMatch && !fenceMatch[1].includes("```")) {
        responseToSave = fenceMatch[1];
      }
      context.variables.set(saveTo, responseToSave);
      context.lastCommandInfo = {
        nodeId: node.id,
        originalPrompt,
        saveTo,
      };
    }
    setSystemVariable(context, "_lastModel", model);
    return { usedModel: model, elapsedMs: Date.now() - localStartTime };
  }

  // API provider model: route to correct provider implementation
  if (isApiProviderModel(model)) {
    const providerId = getApiProviderId(model);
    const providerConfig = plugin.settings.apiProviders.find(p => p.id === providerId && p.enabled && p.verified);
    if (!providerConfig) {
      throw new Error("No enabled API provider configured");
    }

    const providerModelName = getApiProviderModelName(model) || providerConfig.enabledModels[0] || "";
    if (providerConfig.type === "gemini") {
      geminiProviderConfig = providerConfig;
      model = (providerModelName || "gemini-3.5-flash") as import("../../types").ModelType;
    } else {
      // Build system prompt with local RAG context if available
      let apiSystemPrompt = "";
      let apiRagAttachments: import("../../types").Attachment[] = [];

      // Local RAG: check for RAG setting
      const apiRagSettingName = node.properties["ragSetting"];
      const effectiveApiRagName = apiRagSettingName === undefined
        ? (plugin.workspaceState.selectedRagSetting ?? undefined)
        : apiRagSettingName;
      if (effectiveApiRagName && effectiveApiRagName !== "__none__" && effectiveApiRagName !== "__websearch__" && effectiveApiRagName !== "") {
        const resolvedRagSetting = plugin.workspaceState.ragSettings[effectiveApiRagName];
        if (resolvedRagSetting) {
          try {
            const localRag = await searchLocalRag(
              effectiveApiRagName, prompt,
              resolvedRagSetting, getGeminiApiKey(plugin.settings),
              plugin.settings.proxyUrl, plugin.settings.proxyBypass
            );
            if (localRag.sources.length > 0) {
              apiSystemPrompt = localRag.context;
              if (localRag.mediaReferences.length > 0) {
                apiRagAttachments = await loadRagMediaAttachments(app, localRag.mediaReferences);
              }
            }
          } catch (e) {
            console.error("Local RAG search failed in workflow command (api-provider):", formatError(e));
          }
        }
      }

      // Build tools
      const apiVaultToolMode = (node.properties["vaultTools"] || "all") as "all" | "noSearch" | "none";
      let apiTools: ToolDefinition[] = [];
      const searchToolNames = ["search_notes", "list_notes"];

      if (apiVaultToolMode !== "none") {
        const vaultTools = getEnabledTools({ allowWrite: true, allowDelete: true, ragEnabled: false });
        apiTools = vaultTools.filter(tool => {
          if (apiVaultToolMode === "noSearch") return !searchToolNames.includes(tool.name);
          return true;
        });
      }
      apiTools.push(EXECUTE_JAVASCRIPT_TOOL);

      const obsidianToolExecutor = createToolExecutor(app, {
        listNotesLimit: plugin.settings.listNotesLimit,
        maxNoteChars: plugin.settings.maxNoteChars,
        limitVaultToolScope: true,
        cloudVaultToolAllowedFolders: plugin.settings.cloudVaultToolAllowedFolders,
      });

      // Fetch MCP tools
      const apiMcpServersStr = node.properties["mcpServers"] || "";
      const apiEnabledMcpNames = apiMcpServersStr
        ? apiMcpServersStr.split(",").map((s: string) => s.trim()).filter((s: string) => s)
        : [];
      let apiMcpToolExecutor: ReturnType<typeof createMcpToolExecutor> | null = null;

      if (apiEnabledMcpNames.length > 0 && plugin.settings.mcpServers) {
        const enabledServers = plugin.settings.mcpServers.filter(
          server => apiEnabledMcpNames.includes(server.name)
        );
        if (enabledServers.length > 0) {
          try {
            const mcpTools = await fetchMcpTools(enabledServers);
            apiTools = [...apiTools, ...mcpTools];
            apiMcpToolExecutor = createMcpToolExecutor(mcpTools, traceId);
          } catch (error) {
            console.error("Failed to fetch MCP tools:", error);
          }
        }
      }

      const baseApiToolExecutor = async (name: string, args: Record<string, unknown>) => {
        if (name.startsWith("mcp_") && apiMcpToolExecutor) {
          const mcpResult = await apiMcpToolExecutor.execute(name, args);
          if (mcpResult.mcpApp && promptCallbacks?.showMcpApp) {
            await promptCallbacks.showMcpApp(mcpResult.mcpApp);
          }
          if (mcpResult.error) return { error: mcpResult.error };
          return { result: mcpResult.result };
        }
        if (name === "execute_javascript") {
          return await handleExecuteJavascriptTool(args);
        }
        return await obsidianToolExecutor(name, args);
      };
      const apiToolExecutor = wrapToolExecutorWithAutoApply(baseApiToolExecutor, app);

      const apiMessages = [{
        role: "user" as const,
        content: prompt,
        timestamp: Date.now(),
        ...(apiRagAttachments.length > 0 ? { attachments: apiRagAttachments } : {}),
      }];

      let apiFullResponse = "";
      let apiStreamUsage: StreamChunkUsage | undefined;
      const apiStartTime = Date.now();

      const genId = tracing.generationStart(traceId ?? null, "api-provider-command", {
        model: providerModelName,
        input: prompt,
        metadata: { provider: providerConfig.name },
      });

      try {
        const streamFn = providerConfig.type === "anthropic"
          ? anthropicChatWithToolsStream(
              providerConfig.baseUrl, providerConfig.apiKey,
              providerModelName, apiMessages, apiTools,
              apiSystemPrompt, apiToolExecutor,
              undefined, undefined,
              plugin.settings.proxyUrl, plugin.settings.proxyBypass,
            )
          : openaiChatWithToolsStream(
              providerConfig.baseUrl, providerConfig.apiKey,
              providerModelName, apiMessages, apiTools,
              apiSystemPrompt, apiToolExecutor,
              undefined, undefined,
              plugin.settings.proxyUrl, plugin.settings.proxyBypass,
            );
        for await (const chunk of streamFn) {
          if (chunk.type === "text") {
            apiFullResponse += chunk.content;
          } else if (chunk.type === "error") {
            throw new Error(chunk.error || "Unknown API error");
          } else if (chunk.type === "done") {
            apiStreamUsage = chunk.usage;
            break;
          }
        }
        tracing.generationEnd(genId, { output: apiFullResponse });
      } catch (error) {
        tracing.generationEnd(genId, { error: formatError(error) });
        throw error;
      }

      // Cleanup MCP
      if (apiMcpToolExecutor) {
        try { await apiMcpToolExecutor.cleanup(); } catch { /* ignore */ }
      }

      // Save response
      const apiSaveTo = node.properties["saveTo"];
      if (apiSaveTo) {
        let responseToSave = apiFullResponse;
        const trimmed = apiFullResponse.trim();
        const fenceMatch = trimmed.match(/^```\w*\r?\n([\s\S]+?)\r?\n```$/);
        if (fenceMatch && !fenceMatch[1].includes("```")) {
          responseToSave = fenceMatch[1];
        }
        context.variables.set(apiSaveTo, responseToSave);
        context.lastCommandInfo = { nodeId: node.id, originalPrompt, saveTo: apiSaveTo };
      }
      setSystemVariable(context, "_lastModel", `api:${providerConfig.id}`);
      return { usedModel: model, usage: apiStreamUsage, elapsedMs: Date.now() - apiStartTime };
    }
  }

  // Non-CLI model: use GeminiClient
  // Get RAG setting
  // undefined/"" = use current, "__none__" = no RAG, "__websearch__" = web search, other = setting name
  const ragSettingName = node.properties["ragSetting"];
  let useWebSearch = false;

  if (ragSettingName === "__websearch__") {
    // Web search mode
    useWebSearch = true;
  }

  // Local RAG: search local embeddings and inject context into system prompt
  let localRagSystemPrompt: string | undefined;
  let localRagMediaAttachments: import("../../types").Attachment[] = [];
  {
    const effectiveRagSettingName = ragSettingName === undefined
      ? (plugin.workspaceState.selectedRagSetting ?? undefined)
      : ragSettingName;
    if (effectiveRagSettingName && effectiveRagSettingName !== "__none__" && effectiveRagSettingName !== "__websearch__" && effectiveRagSettingName !== "") {
      const resolvedRagSetting = plugin.workspaceState.ragSettings[effectiveRagSettingName];
      if (resolvedRagSetting) {
        try {
          const localRag = await searchLocalRag(
            effectiveRagSettingName, prompt,
            resolvedRagSetting, getGeminiApiKey(plugin.settings),
            plugin.settings.proxyUrl, plugin.settings.proxyBypass
          );
          if (localRag.sources.length > 0) {
            localRagSystemPrompt = localRag.context;
            if (localRag.mediaReferences.length > 0) {
              localRagMediaAttachments = await loadRagMediaAttachments(app, localRag.mediaReferences);
            }
          }
        } catch (e) {
          console.error("Local RAG search failed in workflow command:", formatError(e));
        }
      }
    }
  }

  // Get GeminiClient
  const client = geminiProviderConfig
    ? new GeminiClient(
        geminiProviderConfig.apiKey || getGeminiApiKey(plugin.settings),
        model,
        plugin.settings.proxyUrl,
        plugin.settings.proxyBypass
      )
    : getGeminiClient();
  if (!client) {
    throw new Error("GeminiClient not initialized");
  }
  client.setModel(model);

  // Parse attachments property (comma-separated variable names containing FileExplorerData)
  const attachmentsStr = node.properties["attachments"] || "";
  const attachments: import("../../types").Attachment[] = [];

  if (attachmentsStr) {
    const varNames = attachmentsStr.split(",").map((s) => s.trim()).filter((s) => s);
    for (const varName of varNames) {
      const varValue = context.variables.get(varName);
      if (varValue && typeof varValue === "string") {
        try {
          const fileData: FileExplorerData = JSON.parse(varValue);
          if (fileData.contentType === "binary" && fileData.data) {
            // Determine attachment type from MIME type
            let attachmentType: "image" | "pdf" | "text" | "audio" | "video" = "text";
            if (fileData.mimeType.startsWith("image/")) {
              attachmentType = "image";
            } else if (fileData.mimeType === "application/pdf") {
              attachmentType = "pdf";
            } else if (fileData.mimeType.startsWith("audio/")) {
              attachmentType = "audio";
            } else if (fileData.mimeType.startsWith("video/")) {
              attachmentType = "video";
            }
            attachments.push({
              name: fileData.basename,
              type: attachmentType,
              mimeType: fileData.mimeType,
              data: fileData.data,
            });
          }
          // Text files are already included via variable substitution in the prompt
        } catch {
          // Not valid FileExplorerData JSON, skip
        }
      }
    }
  }

  // Build messages
  const allAttachments = [...attachments, ...localRagMediaAttachments];
  const messages = [
    {
      role: "user" as const,
      content: prompt,
      timestamp: Date.now(),
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
    },
  ];

  // Get vault tools mode (default: "all")
  // "all" = all vault tools, "noSearch" = exclude search_notes/list_notes, "none" = no vault tools
  const vaultToolMode = (node.properties["vaultTools"] || "all") as "all" | "noSearch" | "none";

  // Get MCP server names to enable (comma-separated)
  const mcpServersStr = node.properties["mcpServers"] || "";
  const enabledMcpServerNames = mcpServersStr
    ? mcpServersStr.split(",").map((s: string) => s.trim()).filter((s: string) => s)
    : [];

  // Prepare tools and executors for non-image models
  let tools: ToolDefinition[] = [];
  let toolExecutor: ((name: string, args: Record<string, unknown>) => Promise<unknown>) | undefined;
  let mcpToolExecutor: ReturnType<typeof createMcpToolExecutor> | null = null;

  const isImageModel = isImageGenerationModel(model);

  if (!isImageModel && vaultToolMode !== "none") {
    // Get vault tools based on RAG setting
    const allowRag = ragSettingName !== "__websearch__" && ragSettingName !== "__none__" && ragSettingName !== "";
    const vaultTools = getEnabledTools({
      allowWrite: true,
      allowDelete: true,
      ragEnabled: allowRag,
    });

    // Filter vault tools based on mode
    const searchToolNames = ["search_notes", "list_notes"];

    tools = vaultTools.filter(tool => {
      if (vaultToolMode === "noSearch") {
        return !searchToolNames.includes(tool.name);
      }
      return true; // "all" mode - keep all vault tools
    });

    // Create vault tool executor
    const obsidianToolExecutor = createToolExecutor(app, {
      listNotesLimit: plugin.settings.listNotesLimit,
      maxNoteChars: plugin.settings.maxNoteChars,
      limitVaultToolScope: shouldLimitLlmVaultTools,
      cloudVaultToolAllowedFolders: plugin.settings.cloudVaultToolAllowedFolders,
    });

    // Fetch MCP tools from specified servers
    let mcpTools: McpToolDefinition[] = [];
    if (enabledMcpServerNames.length > 0 && plugin.settings.mcpServers) {
      const enabledServers = plugin.settings.mcpServers.filter(
        server => enabledMcpServerNames.includes(server.name)
      );
      if (enabledServers.length > 0) {
        try {
          mcpTools = await fetchMcpTools(enabledServers);
          // Add MCP tools to the tools array
          tools = [...tools, ...mcpTools];
          // Create MCP tool executor
          mcpToolExecutor = createMcpToolExecutor(mcpTools, traceId);
        } catch (error) {
          console.error("Failed to fetch MCP tools:", error);
          // Continue without MCP tools
        }
      }
    }

    // Add execute_javascript tool
    tools.push(EXECUTE_JAVASCRIPT_TOOL);

    // Create combined tool executor
    if (tools.length > 0) {
      const baseToolExecutor = async (name: string, args: Record<string, unknown>) => {
        // MCP tools start with "mcp_"
        if (name.startsWith("mcp_") && mcpToolExecutor) {
          const mcpResult = await mcpToolExecutor.execute(name, args);
          // Show MCP App UI if available and collect the info
          if (mcpResult.mcpApp) {
            collectedMcpAppInfo = mcpResult.mcpApp;
            if (promptCallbacks?.showMcpApp) {
              await promptCallbacks.showMcpApp(mcpResult.mcpApp);
            }
          }
          if (mcpResult.error) {
            return { error: mcpResult.error };
          }
          return { result: mcpResult.result };
        }
        // JavaScript sandbox tool
        if (name === "execute_javascript") {
          return await handleExecuteJavascriptTool(args);
        }
        // Otherwise use Obsidian tool executor
        return await obsidianToolExecutor(name, args);
      };
      toolExecutor = wrapToolExecutorWithAutoApply(baseToolExecutor, app);
    }
  } else if (!isImageModel && enabledMcpServerNames.length > 0 && plugin.settings.mcpServers) {
    // vaultToolMode is "none" but MCP servers are specified
    const enabledServers = plugin.settings.mcpServers.filter(
      server => enabledMcpServerNames.includes(server.name)
    );
    if (enabledServers.length > 0) {
      try {
        const mcpTools = await fetchMcpTools(enabledServers);
        tools = [...mcpTools, EXECUTE_JAVASCRIPT_TOOL];
        mcpToolExecutor = createMcpToolExecutor(mcpTools, traceId);
        toolExecutor = async (name: string, args: Record<string, unknown>) => {
          if (name === "execute_javascript") {
            return await handleExecuteJavascriptTool(args);
          }
          if (mcpToolExecutor) {
            const mcpResult = await mcpToolExecutor.execute(name, args);
            // Show MCP App UI if available and collect the info
            if (mcpResult.mcpApp) {
              collectedMcpAppInfo = mcpResult.mcpApp;
              if (promptCallbacks?.showMcpApp) {
                await promptCallbacks.showMcpApp(mcpResult.mcpApp);
              }
            }
            if (mcpResult.error) {
              return { error: mcpResult.error };
            }
            return { result: mcpResult.result };
          }
          return { error: `Unknown tool: ${name}` };
        };
      } catch (error) {
        console.error("Failed to fetch MCP tools:", error);
      }
    }
  }

  // If no tools but not image model, still add execute_javascript
  if (!isImageModel && tools.length === 0) {
    tools = [EXECUTE_JAVASCRIPT_TOOL];
    toolExecutor = async (name: string, args: Record<string, unknown>) => {
      if (name === "execute_javascript") {
        return await handleExecuteJavascriptTool(args);
      }
      return { error: `Unknown tool: ${name}` };
    };
  }

  // Execute LLM call - use generateImageStream for image models
  let fullResponse = "";
  const generatedImages: Array<{ mimeType: string; data: string }> = [];

  const stream = isImageModel
    ? client.generateImageStream(
        messages,
        model,
        undefined, // No system prompt for image generation
        useWebSearch,
        undefined,
        traceId
      )
    : client.chatWithToolsStream(
        messages,
        tools,
        localRagSystemPrompt || undefined, // System prompt with local RAG context if available
        toolExecutor,
        undefined,
        useWebSearch, // Web search mode
        { enableThinking: node.properties["enableThinking"] !== "false", traceId }
      );

  let thinkingContent = "";
  let streamUsage: StreamChunkUsage | undefined;
  const apiStartTime = Date.now();
  for await (const chunk of stream) {
    if (chunk.type === "text") {
      fullResponse += chunk.content;
    } else if (chunk.type === "thinking") {
      thinkingContent += chunk.content || "";
      // Stream thinking content to the progress modal
      promptCallbacks?.onThinking?.(node.id, thinkingContent);
    } else if (chunk.type === "image_generated" && chunk.generatedImage) {
      generatedImages.push(chunk.generatedImage);
    } else if (chunk.type === "error") {
      throw new Error(chunk.error || chunk.content || "Unknown API error");
    } else if (chunk.type === "done") {
      streamUsage = chunk.usage;
      break;
    }
  }

  // Cleanup MCP executor
  if (mcpToolExecutor) {
    try {
      await mcpToolExecutor.cleanup();
    } catch (error) {
      console.error("Failed to cleanup MCP executor:", error);
    }
  }

  // Save response to variable if specified
  const saveTo = node.properties["saveTo"];
  if (saveTo) {
    // Strip markdown code fences if the entire response is a single code block.
    // LLMs commonly wrap output in ```json ... ``` fences which are purely formatting;
    // storing them breaks downstream script nodes that embed the value in template literals.
    let responseToSave = fullResponse;
    const trimmed = fullResponse.trim();
    const fenceMatch = trimmed.match(/^```\w*\r?\n([\s\S]+?)\r?\n```$/);
    if (fenceMatch && !fenceMatch[1].includes("```")) {
      responseToSave = fenceMatch[1];
    }
    context.variables.set(saveTo, responseToSave);
    // Save command info for potential regeneration (used when note node requests changes)
    context.lastCommandInfo = {
      nodeId: node.id,
      originalPrompt,
      saveTo,
    };
  }
  setSystemVariable(context, "_lastModel", model);

  // Save generated images to variable if specified
  const saveImageTo = node.properties["saveImageTo"];
  if (saveImageTo && generatedImages.length > 0) {
    // Convert to FileExplorerData format for consistency with file-explorer node
    const imageDataList: FileExplorerData[] = generatedImages.map((img, index) => {
      const extension = img.mimeType.split("/")[1] || "png";
      const filename = `generated-image-${index + 1}.${extension}`;
      return {
        path: filename,
        basename: filename,
        name: `generated-image-${index + 1}`,
        extension,
        mimeType: img.mimeType,
        contentType: "binary" as const,
        data: img.data,
      };
    });

    // If single image, save as single object; if multiple, save as array
    if (imageDataList.length === 1) {
      context.variables.set(saveImageTo, JSON.stringify(imageDataList[0]));
    } else {
      context.variables.set(saveImageTo, JSON.stringify(imageDataList));
    }
  }

  // Return collected MCP App info and used model
  return { mcpAppInfo: collectedMcpAppInfo, usedModel: model, usage: streamUsage, elapsedMs: Date.now() - apiStartTime };
}
