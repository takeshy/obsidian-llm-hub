/**
 * Script Runner
 * Shared logic for executing scripts/commands via child_process.spawn.
 * Used by skill script execution (Chat.tsx) and shell workflow node.
 * Desktop only — mobile environments do not have child_process.
 */

import { Platform } from "obsidian";
import { getChildProcess, findNodeBinary } from "./cliProvider";

/**
 * Resolve interpreter from file extension.
 * Returns null for unknown extensions (direct execution with shebang).
 */
export function getInterpreter(filePath: string): { command: string; args: string[] } | null {
  const ext = filePath.slice(filePath.lastIndexOf(".") + 1).toLowerCase();
  switch (ext) {
    case "sh":
    case "bash":
      return { command: "bash", args: [filePath] };
    case "py":
      return { command: "python3", args: [filePath] };
    case "js":
    case "mjs":
      return { command: findNodeBinary(), args: [filePath] };
    case "ts":
      return { command: "npx", args: ["tsx", filePath] };
    case "rb":
      return { command: "ruby", args: [filePath] };
    default:
      return null;
  }
}

export interface RunScriptOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface RunScriptResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
}

const DEFAULT_TIMEOUT = 60_000;

/**
 * Execute a command via child_process.spawn with shell: false.
 * Returns a promise that resolves with the result.
 */
export function runScript(options: RunScriptOptions): Promise<RunScriptResult> {
  if (Platform.isMobile) {
    return Promise.resolve({
      success: false,
      stdout: "",
      stderr: "",
      exitCode: null,
      error: "Script execution is not available on mobile",
    });
  }

  const { command, args, cwd, env, timeout = DEFAULT_TIMEOUT } = options;
  const { spawn } = getChildProcess();

  return new Promise((resolve) => {
    try {
      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
        cwd: cwd || undefined,
        env: {
          ...(typeof process !== "undefined" ? process.env : {}),
          ...env,
        },
      });

      let stdout = "";
      let stderr = "";
      let settled = false;

      proc.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        proc.kill();
        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: null,
          error: `Script timed out after ${timeout / 1000} seconds`,
        });
      }, timeout);

      proc.on("close", (code: number | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
        });
      });

      proc.on("error", (err: Error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: null,
          error: err.message,
        });
      });
    } catch (err) {
      resolve({
        success: false,
        stdout: "",
        stderr: "",
        exitCode: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
