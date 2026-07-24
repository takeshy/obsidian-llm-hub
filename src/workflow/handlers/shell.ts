/**
 * Shell node handler.
 * Executes a shell command via child_process.spawn (desktop only).
 */
import { App } from "obsidian";
import type { WorkflowNode, ExecutionContext } from "../types";
import { parseJsonRecord, replaceVariables } from "./utils";
import { runScript } from "../../core/scriptRunner";

const DEFAULT_TIMEOUT = 60_000;

export async function handleShellNode(
  node: WorkflowNode,
  context: ExecutionContext,
  app: App,
): Promise<void> {
  const commandTemplate = node.properties["command"];
  if (!commandTemplate) throw new Error("Shell node missing 'command' property");

  const command = replaceVariables(commandTemplate, context);

  // Parse args: JSON array or empty
  let args: string[] = [];
  const argsTemplate = node.properties["args"];
  if (argsTemplate) {
    const argsStr = replaceVariables(argsTemplate, context);
    try {
      const parsed = JSON.parse(argsStr) as unknown;
      if (Array.isArray(parsed)) {
        args = parsed.map(String);
      }
    } catch {
      // Treat as a single argument if not valid JSON array
      args = [argsStr];
    }
  }

  // Working directory
  const cwdTemplate = node.properties["cwd"];
  const vaultBasePath = (app.vault.adapter as { basePath?: string }).basePath || ".";
  const cwd = cwdTemplate ? replaceVariables(cwdTemplate, context) : vaultBasePath;

  // Timeout
  const timeoutStr = node.properties["timeout"];
  const timeout = timeoutStr ? parseInt(timeoutStr, 10) || DEFAULT_TIMEOUT : DEFAULT_TIMEOUT;

  // Parse env: JSON object of environment variables
  const envVars: Record<string, string> = { VAULT_PATH: vaultBasePath };
  const envTemplate = node.properties["env"];
  if (envTemplate) {
    const envStr = replaceVariables(envTemplate, context);
    try {
      const parsed = parseJsonRecord(envStr);
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          envVars[k] = String(v);
        }
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  const result = await runScript({
    command, args, cwd, timeout,
    env: envVars,
  });

  // Save results to variables
  const saveTo = node.properties["saveTo"];
  if (saveTo) {
    context.variables.set(saveTo, result.stdout);
  }

  const saveStderrTo = node.properties["saveStderrTo"];
  if (saveStderrTo) {
    context.variables.set(saveStderrTo, result.stderr);
  }

  const saveExitCodeTo = node.properties["saveExitCodeTo"];
  if (saveExitCodeTo) {
    context.variables.set(saveExitCodeTo, String(result.exitCode ?? ""));
  }

  // throwOnError defaults to "true"
  const throwOnError = node.properties["throwOnError"] !== "false";
  if (throwOnError && !result.success) {
    throw new Error(`Shell command failed (exit ${result.exitCode}): ${result.error || result.stderr}`);
  }
}
