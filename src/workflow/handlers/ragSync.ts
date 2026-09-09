import type { App } from "obsidian";
import type { LlmHubPlugin } from "../../plugin";
import type { WorkflowNode, ExecutionContext } from "obsidian-llm-hub-common/workflow";
import { replaceVariables } from "obsidian-llm-hub-common/workflow";

// Handle rag-sync node - run a full incremental sync of the local RAG index.
export async function handleRagSyncNode(
  node: WorkflowNode,
  context: ExecutionContext,
  _app: App,
  plugin: LlmHubPlugin
): Promise<void> {
  const saveTo = node.properties["saveTo"];
  const pathRaw = node.properties["path"] || "";
  const requestedPath = pathRaw ? replaceVariables(pathRaw, context) : undefined;
  const ragSettingRaw = node.properties["ragSetting"] || "";
  const ragSetting = (ragSettingRaw ? replaceVariables(ragSettingRaw, context) : "")
    || plugin.workspaceState.selectedRagSetting;

  if (!ragSetting) {
    throw new Error("No local RAG setting selected. Set ragSetting or select a semantic search setting first.");
  }

  // Local RAG currently exposes full incremental sync only. Preserve legacy
  // path input in the result, but use the setting's folder/exclusion filters.
  const result = await plugin.syncVaultForLocalRAG(ragSetting);
  if (!result) {
    throw new Error(`Local RAG sync could not start for setting "${ragSetting}".`);
  }

  if (saveTo) {
    context.variables.set(saveTo, JSON.stringify({
      ...result,
      ragSetting,
      requestedPath,
      syncedAt: Date.now(),
      mode: "full-incremental",
    }));
  }
}

// Handle obsidian-command node - execute an Obsidian command
