// The built-in Vault tools live in the shared library. What stays here is this
// host's execution context and the flag saying which tools it can answer.
import type { App } from "obsidian";
import {
  createVaultToolExecutor,
  executeVaultTool,
  type VaultToolExecutionContext,
  type VaultToolResult,
} from "obsidian-llm-hub-common/vault";

/**
 * Whether this host can answer `get_rag_sync_status`. Its RAG store keeps no
 * per-file import state, so no executor answers the tool and
 * `getEnabledVaultTools` must not advertise it. Flip this the day one exists;
 * toolExecutor.contract.test.ts fails if the two ever disagree.
 */
export const HOST_EXECUTES_RAG_SYNC_STATUS = false;

export type ToolResult = VaultToolResult;
export type ToolExecutionContext = VaultToolExecutionContext;

export function executeToolCall(
  app: App,
  toolName: string,
  args: Record<string, unknown>,
  context?: ToolExecutionContext,
): Promise<ToolResult> {
  return executeVaultTool(app, toolName, args, context);
}

export function createToolExecutor(
  app: App,
  context?: ToolExecutionContext,
): (name: string, args: Record<string, unknown>) => Promise<unknown> {
  return createVaultToolExecutor(app, context);
}
