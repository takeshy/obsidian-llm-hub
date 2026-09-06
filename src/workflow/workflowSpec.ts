// The workflow format the AI writes against lives in the shared library, beside the
// executor it describes. This file only tells it what this plugin offers.
import { CLI_MODEL, CODEX_CLI_MODEL } from "src/types";
import type { LlmHubPlugin } from "src/plugin";
import {
  getWorkflowSpecification,
  handleGetWorkflowSpec as handleSharedGetWorkflowSpec,
  type WorkflowSpecContext,
} from "obsidian-llm-hub-common/workflow";

export {
  getWorkflowSpecification,
  getWorkflowNodeSpec,
  WORKFLOW_SPECIFICATION,
  GET_WORKFLOW_SPEC_TOOL,
  GET_WORKFLOW_SPEC_TOOL_NAME,
  type WorkflowSpecContext,
} from "obsidian-llm-hub-common/workflow";

/** Build the spec context from the plugin's current settings & workspace state. */
export function buildWorkflowSpecContext(plugin: LlmHubPlugin): WorkflowSpecContext {
  const modelNames: string[] = [];
  if (plugin.settings.cliConfig?.cliVerified) modelNames.push(CLI_MODEL.name);
  if (plugin.settings.cliConfig?.codexCliVerified) modelNames.push(CODEX_CLI_MODEL.name);
  for (const provider of plugin.settings.apiProviders) {
    if (provider.enabled && provider.verified) modelNames.push(`api:${provider.id}`);
  }
  return {
    modelNames,
    mcpServers: plugin.settings.mcpServers,
    ragSettingNames: Object.keys(plugin.workspaceState.ragSettings),
  };
}

export function handleGetWorkflowSpec(
  args: Record<string, unknown>,
  plugin: LlmHubPlugin,
): { result: string } {
  return handleSharedGetWorkflowSpec(args, buildWorkflowSpecContext(plugin));
}

/** The spec as this plugin's current configuration renders it. */
export function getPluginWorkflowSpecification(plugin: LlmHubPlugin): string {
  return getWorkflowSpecification(buildWorkflowSpecContext(plugin));
}
