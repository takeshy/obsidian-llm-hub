/**
 * CLI Provider abstraction layer
 * Allows using Gemini CLI, Claude CLI, or Codex CLI as chat backend
 *
 * Resolution strategy (Windows):
 * 1. If a custom path is configured, dispatch by extension:
 *      .js  → run via `node`  (shell: false)
 *      .exe → run directly    (shell: false)
 *      else → run via shell   (shell: true) — for `.cmd`/`.bat` wrappers
 * 2. Otherwise auto-detect the npm-global `.js` script and run with `node` (shell: false).
 * 3. Also auto-detect standalone Claude at `%LOCALAPPDATA%\Programs\claude\claude.exe`.
 * 4. Fall back to `shell: true` + command name (`gemini`/`claude`/`codex`) so a
 *    `.cmd` wrapper in PATH still works.
 *
 * We prefer `shell: false` whenever possible because `shell: true` on Windows
 * routes arguments through cmd.exe, where metacharacters in user prompts
 * (`&`, `|`, `>`, `^`, `%VAR%`) can cause misbehavior or command injection.
 *
 * Non-Windows always uses `shell: false`; `.js` custom paths run through the
 * resolved `node` binary to sidestep shebang/PATH issues.
 *
 * Note: child_process is dynamically imported to avoid loading on mobile
 */

import { Platform } from "obsidian";
import type { Message, StreamChunk, ChatProvider } from "../types";

// Type for ChildProcess (avoid static import)
export type ChildProcessType = import("child_process").ChildProcess;

/** Resolved CLI invocation — command, args, and whether to use a shell */
type ResolvedCommand = { command: string; args: string[]; shell: boolean };

/**
 * Load child_process on desktop only.
 */
export function getChildProcess(): typeof import("child_process") {
  const loader =
    (globalThis as unknown as { require?: (id: string) => unknown }).require ||
    (globalThis as unknown as { module?: { require?: (id: string) => unknown } }).module?.require;
  if (!loader) {
    throw new Error("child_process is not available in this environment");
  }
  return loader("child_process") as typeof import("child_process");
}

/**
 * Check if running on Windows (only evaluated on desktop)
 */
export function isWindows(): boolean {
  if (Platform.isMobile) return false;
  return typeof process !== "undefined" && process.platform === "win32";
}

/**
 * Result of CLI path validation
 */
export type CliPathValidationResult =
  | { valid: true }
  | { valid: false; reason: "invalid_chars" | "file_not_found" };

/**
 * Validate custom CLI path for security
 * - Must not contain shell metacharacters
 * - Must exist as a file
 */
export function validateCliPath(path: string): CliPathValidationResult {
  // Check for shell metacharacters that could be used for injection
  const dangerousChars = /[;&|`$(){}[\]<>!#*?\\'"]/;
  // Allow backslash on Windows for path separators
  if (isWindows()) {
    const dangerousCharsWindows = /[;&|`$(){}[\]<>!#*?'"]/;
    if (dangerousCharsWindows.test(path.replace(/\\/g, ""))) {
      return { valid: false, reason: "invalid_chars" };
    }
  } else if (dangerousChars.test(path)) {
    return { valid: false, reason: "invalid_chars" };
  }

  // Verify file exists
  if (!fileExistsSync(path)) {
    return { valid: false, reason: "file_not_found" };
  }

  return { valid: true };
}

// Internal function for backward compatibility
function validateCustomPath(path: string): boolean {
  return validateCliPath(path).valid;
}

/**
 * Find the node binary path, checking common installation locations
 * including version managers (nodenv, nvm, volta, fnm).
 * Returns the full path to node if found, otherwise "node" as fallback.
 */
export function findNodeBinary(): string {
  if (typeof process === "undefined") return "node";

  const home = process.env?.HOME;
  const candidatePaths: string[] = [];

  if (home) {
    // nodenv
    candidatePaths.push(`${home}/.nodenv/shims/node`);
    // nvm (via NVM_DIR or default location)
    const nvmDir = process.env?.NVM_DIR || `${home}/.nvm`;
    candidatePaths.push(`${nvmDir}/current/bin/node`);
    // volta
    candidatePaths.push(`${home}/.volta/bin/node`);
    // fnm
    candidatePaths.push(`${home}/.fnm/aliases/default/bin/node`);
    // asdf
    candidatePaths.push(`${home}/.asdf/shims/node`);
    // mise (formerly rtx)
    candidatePaths.push(`${home}/.local/share/mise/shims/node`);
    // Standard locations
    candidatePaths.push(`${home}/.local/bin/node`);
  }

  // Homebrew (macOS)
  candidatePaths.push("/opt/homebrew/bin/node");
  // Standard system paths
  candidatePaths.push("/usr/local/bin/node");
  candidatePaths.push("/usr/bin/node");

  for (const path of candidatePaths) {
    if (fileExistsSync(path)) {
      return path;
    }
  }

  return "node";
}

/**
 * Dispatch a custom CLI path on Windows by extension.
 * `.js` runs via node, `.exe` runs directly, everything else (e.g. `.cmd`/`.bat`)
 * goes through the shell. Keeps `shell: false` whenever possible.
 */
function resolveWindowsCustomPath(customPath: string, args: string[]): ResolvedCommand {
  const lower = customPath.toLowerCase();
  if (lower.endsWith(".js")) {
    // Preserve backwards compatibility with existing `...\dist\index.js` settings
    return { command: "node", args: [customPath, ...args], shell: false };
  }
  if (lower.endsWith(".exe")) {
    return { command: customPath, args, shell: false };
  }
  // `.cmd` / `.bat` / unknown — must go through cmd.exe
  return { command: customPath, args, shell: true };
}

/**
 * Resolve the Gemini CLI command and arguments.
 *
 * @param args - Command line arguments to pass to the CLI
 * @param customPath - Optional custom path to the CLI script/executable
 */
function resolveGeminiCommand(args: string[], customPath?: string): ResolvedCommand {
  // If custom path is specified, validate and use it
  if (customPath && validateCustomPath(customPath)) {
    if (isWindows()) {
      return resolveWindowsCustomPath(customPath, args);
    }
    const node = findNodeBinary();
    return { command: node, args: [customPath, ...args], shell: false };
  }

  if (isWindows()) {
    // Prefer the npm-global `index.js` so we stay on shell: false
    const scriptPath = findWindowsNpmScript("@google\\gemini-cli\\dist\\index.js");
    if (scriptPath) {
      return { command: "node", args: [scriptPath, ...args], shell: false };
    }
    // Fallback: rely on PATH via cmd.exe so `gemini.cmd` wrappers still work.
    // cmd.exe interpretation of arg metacharacters is a known tradeoff — see header comment.
    return { command: "gemini", args, shell: true };
  }

  // Non-Windows: check common installation paths first (Obsidian may not have full PATH)
  if (typeof process !== "undefined") {
    const home = process.env?.HOME;
    const candidatePaths: string[] = [];

    if (home) {
      // Linux/Mac: ~/.local/bin/gemini
      candidatePaths.push(`${home}/.local/bin/gemini`);
      // npm global with custom prefix: ~/.npm-global/bin/gemini
      candidatePaths.push(`${home}/.npm-global/bin/gemini`);
    }

    // Mac: Homebrew paths
    // Apple Silicon
    candidatePaths.push("/opt/homebrew/bin/gemini");
    // Intel Mac
    candidatePaths.push("/usr/local/bin/gemini");

    for (const path of candidatePaths) {
      if (fileExistsSync(path)) {
        return { command: path, args, shell: false };
      }
    }
  }

  // Fallback: use gemini command directly (must be in PATH)
  return { command: "gemini", args, shell: false };
}

function formatWindowsCliError(message: string | undefined): string | undefined {
  if (!isWindows()) return message;
  const installHint = "Gemini CLI not found. Install it with `npm install -g @google/gemini-cli` and ensure it is in your PATH.";
  if (!message) return installHint;
  if (
    message.includes("Cannot find module") ||
    message.includes("MODULE_NOT_FOUND") ||
    message.includes("not recognized") ||
    message.includes("cannot find the path") ||
    message.includes("@google\\gemini-cli") ||
    message.includes("ENOENT")
  ) {
    return installHint;
  }
  return message;
}

/**
 * Check if a file exists (synchronously) - only for desktop
 */
function fileExistsSync(path: string): boolean {
  try {
    const loader =
      (globalThis as unknown as { require?: (id: string) => unknown }).require ||
      (globalThis as unknown as { module?: { require?: (id: string) => unknown } }).module?.require;
    if (!loader) return false;
    const fs = loader("fs") as typeof import("fs");
    return fs.existsSync(path);
  } catch {
    return false;
  }
}

/**
 * Get candidate Windows npm global `node_modules` directories.
 * Used to find the real `.js` entry point so we can avoid `shell: true`.
 */
function getWindowsNpmPaths(): string[] {
  if (!isWindows() || typeof process === "undefined") return [];

  const paths: string[] = [];
  const env = process.env;

  // Default npm global prefix
  if (env?.APPDATA) {
    paths.push(`${env.APPDATA}\\npm\\node_modules`);
  }
  // Node.js installation directory
  if (env?.PROGRAMFILES) {
    paths.push(`${env.PROGRAMFILES}\\nodejs\\node_modules`);
  }
  const programFilesX86 = env?.["PROGRAMFILES(X86)"];
  if (programFilesX86) {
    paths.push(`${programFilesX86}\\nodejs\\node_modules`);
  }
  // Custom npm prefix from PATH — look for node.exe location
  if (env?.PATH) {
    const pathDirs = env.PATH.split(";");
    for (const dir of pathDirs) {
      if (!dir) continue;
      if (fileExistsSync(`${dir}\\node.exe`)) {
        paths.push(`${dir}\\node_modules`);
      }
      if (dir.toLowerCase().includes("npm") && fileExistsSync(`${dir}\\node_modules`)) {
        paths.push(`${dir}\\node_modules`);
      }
    }
  }

  return [...new Set(paths)];
}

/**
 * Locate an npm-installed `.js` script inside a Windows npm global node_modules.
 * Returns the full path if found, otherwise undefined.
 */
function findWindowsNpmScript(packagePath: string): string | undefined {
  for (const npmPath of getWindowsNpmPaths()) {
    const scriptPath = `${npmPath}\\${packagePath}`;
    if (fileExistsSync(scriptPath)) {
      return scriptPath;
    }
  }
  return undefined;
}

/**
 * Resolve the Claude CLI command and arguments.
 *
 * @param args - Command line arguments to pass to the CLI
 * @param customPath - Optional custom path to the CLI script/executable
 */
function resolveClaudeCommand(args: string[], customPath?: string): ResolvedCommand {
  // If custom path is specified, validate and use it
  if (customPath && validateCustomPath(customPath)) {
    if (isWindows()) {
      return resolveWindowsCustomPath(customPath, args);
    }
    const node = findNodeBinary();
    return { command: node, args: [customPath, ...args], shell: false };
  }

  if (isWindows() && typeof process !== "undefined") {
    // 1. npm-global `.js` script (preferred — keeps shell: false)
    const scriptPath = findWindowsNpmScript("@anthropic-ai\\claude-code\\cli.js");
    if (scriptPath) {
      return { command: "node", args: [scriptPath, ...args], shell: false };
    }
    // 2. Standalone Claude installer
    const localAppdata = process.env?.LOCALAPPDATA;
    if (localAppdata) {
      const exePath = `${localAppdata}\\Programs\\claude\\claude.exe`;
      if (fileExistsSync(exePath)) {
        return { command: exePath, args, shell: false };
      }
    }
    // 3. Fallback: rely on PATH via cmd.exe so `claude.cmd` wrappers still work.
    return { command: "claude", args, shell: true };
  }

  // Non-Windows: check common installation paths first (Obsidian may not have full PATH)
  if (typeof process !== "undefined") {
    const home = process.env?.HOME;
    const candidatePaths: string[] = [];

    if (home) {
      // Linux/Mac: ~/.local/bin/claude
      candidatePaths.push(`${home}/.local/bin/claude`);
      // npm global with custom prefix: ~/.npm-global/bin/claude
      candidatePaths.push(`${home}/.npm-global/bin/claude`);
    }

    // Mac: Homebrew paths
    // Apple Silicon
    candidatePaths.push("/opt/homebrew/bin/claude");
    // Intel Mac
    candidatePaths.push("/usr/local/bin/claude");

    for (const path of candidatePaths) {
      if (fileExistsSync(path)) {
        return { command: path, args, shell: false };
      }
    }
  }

  // Fallback: use claude command directly (must be in PATH)
  return { command: "claude", args, shell: false };
}

function formatWindowsClaudeCliError(message: string | undefined): string | undefined {
  if (!isWindows()) return message;
  const installHint = "Claude CLI not found. Install it with `npm install -g @anthropic-ai/claude-code` and ensure it is in your PATH.";
  if (!message) return installHint;
  if (
    message.includes("Cannot find module") ||
    message.includes("MODULE_NOT_FOUND") ||
    message.includes("not recognized") ||
    message.includes("cannot find the path") ||
    message.includes("@anthropic-ai\\claude-code") ||
    message.includes("ENOENT")
  ) {
    return installHint;
  }
  return message;
}

/**
 * Resolve the Codex CLI command and arguments.
 *
 * @param args - Command line arguments to pass to the CLI
 * @param customPath - Optional custom path to the CLI script/executable
 */
function resolveCodexCommand(args: string[], customPath?: string): ResolvedCommand {
  // If custom path is specified, validate and use it
  if (customPath && validateCustomPath(customPath)) {
    if (isWindows()) {
      return resolveWindowsCustomPath(customPath, args);
    }
    const node = findNodeBinary();
    return { command: node, args: [customPath, ...args], shell: false };
  }

  if (isWindows()) {
    // Prefer the npm-global `.js` script so we stay on shell: false
    const scriptPath = findWindowsNpmScript("@openai\\codex\\bin\\codex.js");
    if (scriptPath) {
      return { command: "node", args: [scriptPath, ...args], shell: false };
    }
    // Fallback: rely on PATH via cmd.exe so `codex.cmd` wrappers still work.
    return { command: "codex", args, shell: true };
  }

  // Non-Windows: check common installation paths first (Obsidian may not have full PATH)
  if (typeof process !== "undefined") {
    const home = process.env?.HOME;
    const candidatePaths: string[] = [];

    if (home) {
      // Linux/Mac: ~/.local/bin/codex
      candidatePaths.push(`${home}/.local/bin/codex`);
      // npm global with custom prefix: ~/.npm-global/bin/codex
      candidatePaths.push(`${home}/.npm-global/bin/codex`);
    }

    // Mac: Homebrew paths
    // Apple Silicon
    candidatePaths.push("/opt/homebrew/bin/codex");
    // Intel Mac
    candidatePaths.push("/usr/local/bin/codex");

    for (const path of candidatePaths) {
      if (fileExistsSync(path)) {
        return { command: path, args, shell: false };
      }
    }
  }

  // Fallback: use codex command directly (must be in PATH)
  return { command: "codex", args, shell: false };
}

function formatWindowsCodexCliError(message: string | undefined): string | undefined {
  if (!isWindows()) return message;
  const installHint = "Codex CLI not found. Install it with `npm install -g @openai/codex` and ensure it is in your PATH.";
  if (!message) return installHint;
  if (
    message.includes("Cannot find module") ||
    message.includes("MODULE_NOT_FOUND") ||
    message.includes("not recognized") ||
    message.includes("cannot find the path") ||
    message.includes("@openai\\codex") ||
    message.includes("ENOENT")
  ) {
    return installHint;
  }
  return message;
}

export interface CliProviderInterface {
  name: ChatProvider;
  displayName: string;
  supportsSessionResumption: boolean;  // Whether this provider supports session resumption
  isAvailable(): Promise<boolean>;
  chatStream(
    messages: Message[],
    systemPrompt: string,
    workingDirectory: string,
    signal?: AbortSignal,
    sessionId?: string  // Optional session ID for resumption
  ): AsyncGenerator<StreamChunk>;
}

/**
 * Format conversation history as a prompt string
 */
function formatHistoryAsPrompt(messages: Message[], systemPrompt: string): string {
  const parts: string[] = [];

  if (systemPrompt) {
    parts.push(`System: ${systemPrompt}\n`);
  }

  // Include conversation history (excluding the last user message)
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const role = msg.role === "user" ? "User" : "Assistant";
    parts.push(`${role}: ${msg.content}\n`);
  }

  // Add the current user message
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.role === "user") {
    parts.push(`User: ${lastMessage.content}`);
  }

  return parts.join("\n");
}

/**
 * Base CLI provider class
 */
abstract class BaseCliProvider implements CliProviderInterface {
  abstract name: ChatProvider;
  abstract displayName: string;
  abstract supportsSessionResumption: boolean;

  /**
   * Resolve the CLI command for version check
   */
  protected abstract resolveVersionCommand(): ResolvedCommand;

  async isAvailable(): Promise<boolean> {
    // CLI is not available on mobile
    if (Platform.isMobile) {
      return false;
    }

    try {
      const { spawn } = getChildProcess();
      const { command, args, shell } = this.resolveVersionCommand();

      return new Promise((resolve) => {
        try {
          const proc = spawn(command, args, {
            stdio: ["pipe", "pipe", "pipe"],
            shell,
            env: typeof process !== "undefined" ? process.env : undefined,
          });

          proc.on("close", (code: number | null) => {
            resolve(code === 0);
          });

          proc.on("error", () => {
            resolve(false);
          });

          // Timeout after 30 seconds
          setTimeout(() => {
            proc.kill();
            resolve(false);
          }, 30000);
        } catch {
          resolve(false);
        }
      });
    } catch {
      return false;
    }
  }

  abstract chatStream(
    messages: Message[],
    systemPrompt: string,
    workingDirectory: string,
    signal?: AbortSignal,
    sessionId?: string
  ): AsyncGenerator<StreamChunk>;
}

/**
 * Gemini CLI provider
 * Uses: gemini -p "prompt"
 * Session resumption: gemini --resume latest -p "prompt"
 * (Gemini CLI uses "latest" or index number, not UUID)
 */
export class GeminiCliProvider extends BaseCliProvider {
  name: ChatProvider = "gemini-cli";
  displayName = "Gemini CLI";
  supportsSessionResumption = true;

  protected resolveVersionCommand(): ResolvedCommand {
    return resolveGeminiCommand(["--version"]);
  }

  async *chatStream(
    messages: Message[],
    systemPrompt: string,
    workingDirectory: string,
    signal?: AbortSignal,
    sessionId?: string  // "latest" to resume the most recent session
  ): AsyncGenerator<StreamChunk> {
    // Dynamically import child_process (not available on mobile)
    const { spawn } = getChildProcess();

    let cliArgs: string[];

    if (sessionId) {
      // Resume session — only send the latest user message
      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage?.role === "user" ? lastMessage.content : "";
      cliArgs = ["--resume", sessionId, "-p", prompt];
    } else {
      // First message — send full history with system prompt
      const prompt = formatHistoryAsPrompt(messages, systemPrompt);
      cliArgs = ["-p", prompt];
    }

    const { command, args, shell } = resolveGeminiCommand(cliArgs);
    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell,
      cwd: workingDirectory,
      env: typeof process !== "undefined" ? process.env : undefined,
    });

    // Handle abort
    if (signal) {
      signal.addEventListener("abort", () => {
        proc.kill("SIGTERM");
      });
    }

    yield* this.processOutput(proc);
  }

  private async *processOutput(proc: ChildProcessType): AsyncGenerator<StreamChunk> {
    // Process stdout
    if (proc.stdout) {
      proc.stdout.setEncoding("utf8");

      for await (const chunk of proc.stdout) {
        yield { type: "text", content: chunk };
      }
    }

    // Wait for process to complete
    await new Promise<void>((resolve, reject) => {
      proc.on("close", (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Gemini CLI exited with code ${code}`));
        }
      });
      proc.on("error", reject);
    });

    // Check for errors in stderr
    if (proc.stderr) {
      let stderr = "";
      proc.stderr.setEncoding("utf8");
      for await (const chunk of proc.stderr) {
        stderr += chunk;
      }
      if (stderr) {
        yield { type: "error", error: stderr };
      }
    }

    yield { type: "done" };
  }
}

/**
 * Claude CLI provider
 * Uses: claude -p "prompt" --output-format stream-json
 * Supports session resumption with --resume sessionId
 */
export class ClaudeCliProvider extends BaseCliProvider {
  name: ChatProvider = "claude-cli";
  displayName = "Claude CLI";
  supportsSessionResumption = true;

  protected resolveVersionCommand(): ResolvedCommand {
    return resolveClaudeCommand(["--version"]);
  }

  async *chatStream(
    messages: Message[],
    systemPrompt: string,
    workingDirectory: string,
    signal?: AbortSignal,
    sessionId?: string  // When provided, resume this session instead of passing full history
  ): AsyncGenerator<StreamChunk> {
    // Dynamically import child_process (not available on mobile)
    const { spawn } = getChildProcess();

    // Build CLI arguments based on whether we have a session ID
    let cliArgs: string[];

    if (sessionId) {
      // Resuming an existing session - only send the latest user message
      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage?.role === "user" ? lastMessage.content : "";

      cliArgs = [
        "--resume", sessionId,
        "-p", prompt,
        "--output-format", "stream-json",
        "--verbose"
      ];
    } else {
      // First message - send full history with system prompt
      const prompt = formatHistoryAsPrompt(messages, systemPrompt);

      cliArgs = [
        "-p", prompt,
        "--output-format", "stream-json",
        "--verbose"
      ];
    }

    const { command, args, shell } = resolveClaudeCommand(cliArgs);
    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell,
      cwd: workingDirectory,
      env: typeof process !== "undefined" ? process.env : undefined,
    });

    // Close stdin immediately to signal no more input
    proc.stdin?.end();

    // Handle abort
    if (signal) {
      signal.addEventListener("abort", () => {
        proc.kill("SIGTERM");
      });
    }

    yield* this.processOutput(proc);
  }

  private async *processOutput(proc: ChildProcessType): AsyncGenerator<StreamChunk> {
    // Process stdout - Claude CLI with --output-format stream-json outputs JSON lines
    if (proc.stdout) {
      proc.stdout.setEncoding("utf8");
      let buffer = "";
      const state = { sessionIdEmitted: false };

      for await (const chunk of proc.stdout) {
        buffer += chunk;

        // Process complete JSON lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";  // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          yield* this.processJsonLine(line, state);
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        yield* this.processJsonLine(buffer, state);
      }
    }

    yield { type: "done" };
  }

  /**
   * Process a single JSON line from Claude CLI stream-json output
   */
  private *processJsonLine(
    line: string,
    state: { sessionIdEmitted: boolean }
  ): Generator<StreamChunk> {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;

      // Handle different message types from Claude CLI stream-json format
      if (parsed.type === "assistant") {
        // Assistant message with content
        const message = parsed.message as Record<string, unknown> | undefined;
        if (message && Array.isArray(message.content)) {
          for (const block of message.content as Array<Record<string, unknown>>) {
            if (block.type === "text" && typeof block.text === "string") {
              yield { type: "text", content: block.text };
            }
          }
        }
      } else if (parsed.type === "content_block_delta") {
        // Streaming delta
        const delta = parsed.delta as Record<string, unknown> | undefined;
        if (delta && delta.type === "text_delta" && typeof delta.text === "string") {
          yield { type: "text", content: delta.text };
        }
      } else if (parsed.type === "error") {
        // Error message
        const error = parsed.error as Record<string, unknown> | undefined;
        const errorMessage = typeof error?.message === "string" ? error.message : (typeof parsed.message === "string" ? parsed.message : "Unknown error");
        yield { type: "error", error: errorMessage };
      }

      // Check for session_id (can appear in assistant or result messages)
      if (!state.sessionIdEmitted) {
        let sessionId: string | undefined;

        // Check direct session_id field (assistant message)
        if (typeof parsed.session_id === "string") {
          sessionId = parsed.session_id;
        }
        // Check result.data.session_id (result message)
        else if (parsed.type === "result") {
          const data = parsed.data as Record<string, unknown> | undefined;
          if (data && typeof data.session_id === "string") {
            sessionId = data.session_id;
          }
        }

        if (sessionId) {
          yield { type: "session_id", sessionId };
          state.sessionIdEmitted = true;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }
}

/**
 * Codex CLI provider
 * Uses: codex exec "prompt" --json --skip-git-repo-check
 * Supports session resumption with: codex exec resume <sessionId> "prompt"
 */
export class CodexCliProvider extends BaseCliProvider {
  name: ChatProvider = "codex-cli";
  displayName = "Codex CLI";
  supportsSessionResumption = true;

  protected resolveVersionCommand(): ResolvedCommand {
    return resolveCodexCommand(["--version"]);
  }

  async *chatStream(
    messages: Message[],
    systemPrompt: string,
    workingDirectory: string,
    signal?: AbortSignal,
    sessionId?: string  // When provided, resume this session
  ): AsyncGenerator<StreamChunk> {
    // Dynamically import child_process (not available on mobile)
    const { spawn } = getChildProcess();

    // Build CLI arguments based on whether we have a session ID
    // Note: --json and --skip-git-repo-check are options for 'exec', must come before subcommands
    let cliArgs: string[];

    if (sessionId) {
      // Resuming an existing session - only send the latest user message
      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage?.role === "user" ? lastMessage.content : "";

      cliArgs = ["exec", "--json", "--skip-git-repo-check", "resume", sessionId, prompt];
    } else {
      // First message - send full history with system prompt
      const prompt = formatHistoryAsPrompt(messages, systemPrompt);

      cliArgs = ["exec", "--json", "--skip-git-repo-check", prompt];
    }

    const { command, args, shell } = resolveCodexCommand(cliArgs);
    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell,
      cwd: workingDirectory,
      env: typeof process !== "undefined" ? process.env : undefined,
    });

    // Close stdin immediately to signal no more input
    proc.stdin?.end();

    // Handle abort
    if (signal) {
      signal.addEventListener("abort", () => {
        proc.kill("SIGTERM");
      });
    }

    yield* this.processOutput(proc);
  }

  private async *processOutput(proc: ChildProcessType): AsyncGenerator<StreamChunk> {
    // Process stdout - Codex CLI with --json outputs newline-delimited JSON
    if (proc.stdout) {
      proc.stdout.setEncoding("utf8");
      let buffer = "";
      const state = { sessionIdEmitted: false };

      for await (const chunk of proc.stdout) {
        buffer += chunk;

        // Process complete JSON lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";  // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          yield* this.processJsonLine(line, state);
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        yield* this.processJsonLine(buffer, state);
      }
    }

    yield { type: "done" };
  }

  /**
   * Process a single JSON line from Codex CLI output
   */
  private *processJsonLine(
    line: string,
    state: { sessionIdEmitted: boolean }
  ): Generator<StreamChunk> {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;

      // Handle thread.started event - extract thread_id for session resumption
      if (parsed.type === "thread.started" && typeof parsed.thread_id === "string") {
        if (!state.sessionIdEmitted) {
          yield { type: "session_id", sessionId: parsed.thread_id };
          state.sessionIdEmitted = true;
        }
      }
      // Handle Codex CLI JSON format
      else if (parsed.type === "item.completed") {
        const item = parsed.item as Record<string, unknown> | undefined;
        if (item && item.type === "agent_message" && typeof item.text === "string") {
          yield { type: "text", content: item.text };
        }
      } else if (parsed.type === "error") {
        const errorMessage = typeof parsed.message === "string" ? parsed.message : (typeof parsed.error === "string" ? parsed.error : "Unknown error");
        yield { type: "error", error: errorMessage };
      }
    } catch {
      // Ignore JSON parse errors
    }
  }
}

/**
 * Persistent CLI session that maintains session state across messages.
 *
 * - Claude CLI: Keeps a single process alive using --input-format stream-json.
 *   Messages are sent as JSON objects via stdin; newlines are preserved via
 *   JSON string escaping. The process maintains full conversation context
 *   internally so --resume is not needed.
 * - Gemini CLI / Codex CLI: Per-message process spawning with --resume for
 *   session continuity (these CLIs don't support stream-json input).
 *
 * Chat lifecycle:  create on first CLI message → reuse → terminate on provider change / new chat / unmount
 * Workflow lifecycle: create at workflow start → pass through context → terminate at workflow end
 */
export class PersistentCliSession {
  private proc: ChildProcessType | null = null;
  private sessionId: string | null = null;
  private _providerType: ChatProvider;
  private workingDirectory: string;
  private customPath?: string;
  private _isAlive = false;
  private systemPrompt: string | null = null;

  // Async I/O for persistent mode (Claude CLI)
  private stdoutBuffer = "";
  private chunkQueue: StreamChunk[] = [];
  private chunkWaiter: ((value: StreamChunk | null) => void) | null = null;
  private closed = false;

  constructor(
    providerType: ChatProvider,
    workingDirectory: string,
    customPath?: string,
    existingSessionId?: string
  ) {
    this._providerType = providerType;
    this.workingDirectory = workingDirectory;
    this.customPath = customPath;
    this.sessionId = existingSessionId || null;
  }

  get isAlive(): boolean { return this._isAlive; }
  get provider(): ChatProvider { return this._providerType; }
  get currentSessionId(): string | null { return this.sessionId; }

  /**
   * Start the session. For Claude CLI without an existing session ID,
   * spawns a persistent process. For others, marks as alive (processes
   * spawned per-message).
   */
  start(): void {
    this._isAlive = true;
  }

  /**
   * Spawn the persistent Claude CLI process with stream-json input/output.
   * Called lazily on first sendMessage so that systemPrompt is available.
   */
  private spawnPersistentClaude(systemPrompt: string): void {
    const { spawn } = getChildProcess();
    const cliArgs = [
      "-p",
      "--input-format", "stream-json",
      "--output-format", "stream-json",
      "--verbose",
    ];
    if (systemPrompt) {
      cliArgs.push("--system-prompt", systemPrompt);
    }
    if (this.sessionId) {
      cliArgs.push("--resume", this.sessionId);
    }
    const { command, args, shell } = resolveClaudeCommand(cliArgs, this.customPath);

    this.closed = false;
    this.stdoutBuffer = "";
    this.chunkQueue = [];
    this.chunkWaiter = null;
    this.systemPrompt = systemPrompt;

    this.proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell,
      cwd: this.workingDirectory,
      env: typeof process !== "undefined" ? process.env : undefined,
    });

    this.proc.on("close", () => {
      this.closed = true;
      this.resolveWaiter(null);
    });

    this.proc.on("error", () => {
      this.closed = true;
      this.resolveWaiter(null);
    });

    if (this.proc.stdout) {
      this.proc.stdout.setEncoding("utf8");
      this.proc.stdout.on("data", (data: string) => {
        this.onStdoutData(data);
      });
    }
  }

  /** Whether this session uses a persistent Claude CLI process */
  private get isPersistentClaude(): boolean {
    return this._providerType === "claude-cli";
  }

  // --- Stdout parsing ---

  private onStdoutData(data: string): void {
    this.stdoutBuffer += data;
    const lines = this.stdoutBuffer.split("\n");
    this.stdoutBuffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        this.handleJsonMessage(parsed);
      } catch {
        // Non-JSON output — ignore
      }
    }
  }

  private handleJsonMessage(parsed: Record<string, unknown>): void {
    // Capture session_id from system init or result
    if (typeof parsed.session_id === "string" && parsed.session_id) {
      this.sessionId = parsed.session_id;
      this.pushChunk({ type: "session_id", sessionId: parsed.session_id });
    } else if (parsed.type === "result") {
      const data = parsed.data as Record<string, unknown> | undefined;
      const sid = data && typeof data.session_id === "string" ? data.session_id : null;
      if (sid) {
        this.sessionId = sid;
        this.pushChunk({ type: "session_id", sessionId: sid });
      }
    }

    if (parsed.type === "assistant") {
      const message = parsed.message as Record<string, unknown> | undefined;
      if (message && Array.isArray(message.content)) {
        for (const block of message.content as Array<Record<string, unknown>>) {
          if (block.type === "text" && typeof block.text === "string") {
            this.pushChunk({ type: "text", content: block.text });
          }
        }
      }
    } else if (parsed.type === "content_block_delta") {
      const delta = parsed.delta as Record<string, unknown> | undefined;
      if (delta?.type === "text_delta" && typeof delta.text === "string") {
        this.pushChunk({ type: "text", content: delta.text });
      }
    } else if (parsed.type === "error") {
      const error = parsed.error as Record<string, unknown> | undefined;
      const errorMsg = typeof error?.message === "string"
        ? error.message
        : (typeof parsed.message === "string" ? parsed.message : "Unknown error");
      this.pushChunk({ type: "error", error: errorMsg });
    } else if (parsed.type === "result") {
      // End of turn — signal done but don't close (process stays alive)
      this.pushChunk({ type: "done" });
    }
  }

  // --- Chunk queue (producer/consumer between stdout handler and sendMessage iterator) ---

  private pushChunk(chunk: StreamChunk): void {
    if (this.chunkWaiter) {
      const waiter = this.chunkWaiter;
      this.chunkWaiter = null;
      waiter(chunk);
    } else {
      this.chunkQueue.push(chunk);
    }
  }

  private resolveWaiter(value: StreamChunk | null): void {
    if (this.chunkWaiter) {
      const waiter = this.chunkWaiter;
      this.chunkWaiter = null;
      waiter(value);
    }
  }

  private nextChunk(): Promise<StreamChunk | null> {
    if (this.chunkQueue.length > 0) {
      return Promise.resolve(this.chunkQueue.shift()!);
    }
    if (this.closed) {
      return Promise.resolve(null);
    }
    return new Promise<StreamChunk | null>(resolve => {
      this.chunkWaiter = resolve;
    });
  }

  // --- Public API ---

  /**
   * Send a message and stream the response.
   * Claude CLI: writes JSON to stdin of persistent process.
   * Others: spawns a new process with optional --resume.
   * Throws on abort so callers can distinguish from normal completion.
   */
  async *sendMessage(
    userMessage: string,
    allMessages: Message[],
    systemPrompt: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    if (!this._isAlive) {
      throw new Error("CLI session is not alive");
    }

    if (this.isPersistentClaude) {
      yield* this.sendViaPersistentClaude(userMessage, systemPrompt, signal);
    } else {
      yield* this.sendViaNewProcess(allMessages, systemPrompt, signal);
    }
  }

  /**
   * Send a message to the persistent Claude CLI process.
   * Spawns the process lazily on first call.
   */
  private async *sendViaPersistentClaude(
    userMessage: string,
    systemPrompt: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    // Spawn process on first message, or restart if it died
    if (!this.proc || this.closed) {
      this.killProcess();
      this.spawnPersistentClaude(systemPrompt);
    }

    if (!this.proc?.stdin) {
      throw new Error("Claude CLI process stdin not available");
    }

    // Clear leftover chunks from any previous turn
    this.chunkQueue = [];

    // Write user message as stream-json input
    const inputMsg = JSON.stringify({
      type: "user",
      message: { role: "user", content: userMessage },
    });
    this.proc.stdin.write(inputMsg + "\n");

    // Create a single abort promise (resolves once, reusable across iterations)
    const abortPromise = signal
      ? new Promise<null>((resolve) => {
          if (signal.aborted) { resolve(null); return; }
          signal.addEventListener("abort", () => resolve(null), { once: true });
        })
      : null;

    // Read response chunks until "done" (end of turn) or process dies
    while (true) {
      if (signal?.aborted) {
        this.killProcess();
        throw new Error("CLI session aborted");
      }

      const chunk = await (abortPromise
        ? Promise.race([this.nextChunk(), abortPromise])
        : this.nextChunk());

      if (chunk === null) {
        // Process died or aborted
        if (signal?.aborted) {
          throw new Error("CLI session aborted");
        }
        // Unexpected death — let caller handle as error
        throw new Error("Claude CLI process terminated unexpectedly");
      }

      yield chunk;
      if (chunk.type === "done") break;
    }
  }

  /**
   * Send via per-message process spawn (Gemini CLI / Codex CLI).
   */
  private async *sendViaNewProcess(
    allMessages: Message[],
    systemPrompt: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    let provider: CliProviderInterface;
    if (this._providerType === "codex-cli") {
      provider = new CodexCliProvider();
    } else {
      provider = new GeminiCliProvider();
    }

    const sessionIdToUse = provider.supportsSessionResumption
      ? this.sessionId || undefined
      : undefined;

    for await (const chunk of provider.chatStream(
      allMessages, systemPrompt, this.workingDirectory, signal, sessionIdToUse
    )) {
      if (chunk.type === "session_id" && chunk.sessionId) {
        this.sessionId = chunk.sessionId;
      }
      yield chunk;
    }

    // Gemini CLI doesn't emit session_id in plain text mode, but its
    // --resume flag accepts "latest" to resume the most recent session.
    // Set it after the first successful response so subsequent messages reuse the session.
    if (this._providerType === "gemini-cli" && !this.sessionId) {
      this.sessionId = "latest";
    }

    if (signal?.aborted) {
      throw new Error("CLI session aborted");
    }
  }

  // --- Lifecycle ---

  /** Kill the persistent process without clearing session state */
  private killProcess(): void {
    if (this.proc && !this.proc.killed) {
      this.proc.kill("SIGTERM");
    }
    this.proc = null;
    this.closed = true;
    this.chunkQueue = [];
    this.resolveWaiter(null);
  }

  /** Terminate the entire session (process + state). */
  terminate(): void {
    this.killProcess();
    this._isAlive = false;
    this.sessionId = null;
    this.stdoutBuffer = "";
    this.systemPrompt = null;
  }
}

/**
 * CLI Provider Manager
 * Manages provider instances and selection
 */
export class CliProviderManager {
  private providers: Map<ChatProvider, CliProviderInterface> = new Map();

  constructor() {
    this.providers.set("gemini-cli", new GeminiCliProvider());
    this.providers.set("claude-cli", new ClaudeCliProvider());
    this.providers.set("codex-cli", new CodexCliProvider());
  }

  getProvider(name: ChatProvider): CliProviderInterface | undefined {
    return this.providers.get(name);
  }

  async getAvailableProviders(): Promise<ChatProvider[]> {
    const available: ChatProvider[] = [];

    for (const [name, provider] of this.providers) {
      if (await provider.isAvailable()) {
        available.push(name);
      }
    }

    return available;
  }

  async isProviderAvailable(name: ChatProvider): Promise<boolean> {
    const provider = this.providers.get(name);
    if (!provider) return false;
    return provider.isAvailable();
  }
}

// Singleton instance
let cliProviderManager: CliProviderManager | null = null;

export function initCliProviderManager(): CliProviderManager {
  cliProviderManager = new CliProviderManager();
  return cliProviderManager;
}

export function getCliProviderManager(): CliProviderManager | null {
  return cliProviderManager;
}

/**
 * Check if we're using a CLI provider
 */
export function isCliProvider(provider: ChatProvider): boolean {
  return provider !== "api";
}

export interface CliVerifyResult {
  success: boolean;
  stage: "version" | "login";
  error?: string;
}

/**
 * Verify Gemini CLI installation and login status
 * @param customPath - Optional custom path to the CLI script/executable
 */
export async function verifyCli(customPath?: string): Promise<CliVerifyResult> {
  if (Platform.isMobile) {
    return { success: false, stage: "version", error: "CLI not available on mobile" };
  }

  // Dynamically import child_process (not available on mobile)
  const { spawn } = getChildProcess();

  // Step 1: Check if CLI exists (--version)
  const versionCheck = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    try {
      const { command, args, shell } = resolveGeminiCommand(["--version"], customPath);
      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell,
        env: typeof process !== "undefined" ? process.env : undefined,
      });

      let stderr = "";
      proc.stderr?.on("data", (data: Uint8Array) => {
        stderr += new TextDecoder().decode(data);
      });

      proc.on("close", (code: number | null) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: formatWindowsCliError(stderr) || `Exit code: ${code}` });
        }
      });

      proc.on("error", (err: Error) => {
        resolve({ success: false, error: formatWindowsCliError(err.message) });
      });

      setTimeout(() => {
        proc.kill();
        resolve({ success: false, error: formatWindowsCliError("Timeout") });
      }, 30000);
    } catch (err) {
      resolve({ success: false, error: formatWindowsCliError(String(err)) });
    }
  });

  if (!versionCheck.success) {
    return { success: false, stage: "version", error: versionCheck.error || "Gemini CLI not found" };
  }

  // Step 2: Check if logged in (run a simple prompt)
  const loginCheck = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    try {
      const { command, args, shell } = resolveGeminiCommand(["-p", "Hello"], customPath);
      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell,
        env: typeof process !== "undefined" ? process.env : undefined,
      });

      let stderr = "";
      proc.stderr?.on("data", (data: Uint8Array) => {
        stderr += new TextDecoder().decode(data);
      });

      proc.on("close", (code: number | null) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: formatWindowsCliError(stderr) || `Exit code: ${code}` });
        }
      });

      proc.on("error", (err: Error) => {
        resolve({ success: false, error: formatWindowsCliError(err.message) });
      });

      setTimeout(() => {
        proc.kill();
        resolve({ success: false, error: formatWindowsCliError("Timeout - CLI may not be logged in") });
      }, 30000);
    } catch (err) {
      resolve({ success: false, error: formatWindowsCliError(String(err)) });
    }
  });

  if (!loginCheck.success) {
    return { success: false, stage: "login", error: loginCheck.error || "Please run 'gemini' in terminal to log in" };
  }

  return { success: true, stage: "login" };
}

/**
 * Verify Claude CLI installation and login status
 * @param customPath - Optional custom path to the CLI script/executable
 */
export async function verifyClaudeCli(customPath?: string): Promise<CliVerifyResult> {
  if (Platform.isMobile) {
    return { success: false, stage: "version", error: "CLI not available on mobile" };
  }

  // Dynamically import child_process (not available on mobile)
  const { spawn } = getChildProcess();

  // Step 1: Check if CLI exists (--version)
  const versionCheck = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    try {
      const { command, args, shell } = resolveClaudeCommand(["--version"], customPath);
      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell,
        env: typeof process !== "undefined" ? process.env : undefined,
      });

      // Close stdin immediately to signal no more input
      proc.stdin?.end();

      let stderr = "";
      proc.stderr?.on("data", (data: Uint8Array) => {
        stderr += new TextDecoder().decode(data);
      });

      proc.on("close", (code: number | null) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: formatWindowsClaudeCliError(stderr) || `Exit code: ${code}` });
        }
      });

      proc.on("error", (err: Error) => {
        resolve({ success: false, error: formatWindowsClaudeCliError(err.message) });
      });

      setTimeout(() => {
        proc.kill();
        resolve({ success: false, error: formatWindowsClaudeCliError("Timeout") });
      }, 30000);
    } catch (err) {
      resolve({ success: false, error: formatWindowsClaudeCliError(String(err)) });
    }
  });

  if (!versionCheck.success) {
    return { success: false, stage: "version", error: versionCheck.error || "Claude CLI not found" };
  }

  // Step 2: Check if logged in (run a simple prompt)
  const loginCheck = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    try {
      const { command, args, shell } = resolveClaudeCommand(["-p", "Hello", "--output-format", "text"], customPath);
      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell,
        env: typeof process !== "undefined" ? process.env : undefined,
      });

      // Close stdin immediately to signal no more input
      proc.stdin?.end();

      let stderr = "";
      proc.stderr?.on("data", (data: Uint8Array) => {
        stderr += new TextDecoder().decode(data);
      });

      // Drain stdout to prevent buffer blocking
      proc.stdout?.on("data", () => {
        // Ignore stdout data, just drain the buffer
      });

      proc.on("close", (code: number | null) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: formatWindowsClaudeCliError(stderr) || `Exit code: ${code}` });
        }
      });

      proc.on("error", (err: Error) => {
        resolve({ success: false, error: formatWindowsClaudeCliError(err.message) });
      });

      setTimeout(() => {
        proc.kill();
        resolve({ success: false, error: formatWindowsClaudeCliError("Timeout - CLI may not be logged in") });
      }, 30000);
    } catch (err) {
      resolve({ success: false, error: formatWindowsClaudeCliError(String(err)) });
    }
  });

  if (!loginCheck.success) {
    return { success: false, stage: "login", error: loginCheck.error || "Please run 'claude' in terminal to log in" };
  }

  return { success: true, stage: "login" };
}

/**
 * Verify Codex CLI installation and login status
 * @param customPath - Optional custom path to the CLI script/executable
 */
export async function verifyCodexCli(customPath?: string): Promise<CliVerifyResult> {
  if (Platform.isMobile) {
    return { success: false, stage: "version", error: "CLI not available on mobile" };
  }

  // Dynamically import child_process (not available on mobile)
  const { spawn } = getChildProcess();

  // Step 1: Check if CLI exists (--version)
  const versionCheck = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    try {
      const { command, args, shell } = resolveCodexCommand(["--version"], customPath);
      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell,
        env: typeof process !== "undefined" ? process.env : undefined,
      });

      // Close stdin immediately to signal no more input
      proc.stdin?.end();

      let stderr = "";
      proc.stderr?.on("data", (data: Uint8Array) => {
        stderr += new TextDecoder().decode(data);
      });

      proc.on("close", (code: number | null) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: formatWindowsCodexCliError(stderr) || `Exit code: ${code}` });
        }
      });

      proc.on("error", (err: Error) => {
        resolve({ success: false, error: formatWindowsCodexCliError(err.message) });
      });

      setTimeout(() => {
        proc.kill();
        resolve({ success: false, error: formatWindowsCodexCliError("Timeout") });
      }, 30000);
    } catch (err) {
      resolve({ success: false, error: formatWindowsCodexCliError(String(err)) });
    }
  });

  if (!versionCheck.success) {
    return { success: false, stage: "version", error: versionCheck.error || "Codex CLI not found" };
  }

  // Step 2: Check if logged in (run a simple prompt)
  const loginCheck = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    try {
      const { command, args, shell } = resolveCodexCommand(["exec", "Hello", "--json", "--skip-git-repo-check"], customPath);
      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell,
        env: typeof process !== "undefined" ? process.env : undefined,
      });

      // Close stdin immediately to signal no more input
      proc.stdin?.end();

      let stderr = "";
      proc.stderr?.on("data", (data: Uint8Array) => {
        stderr += new TextDecoder().decode(data);
      });

      // Drain stdout to prevent buffer blocking
      proc.stdout?.on("data", () => {
        // Ignore stdout data, just drain the buffer
      });

      proc.on("close", (code: number | null) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: formatWindowsCodexCliError(stderr) || `Exit code: ${code}` });
        }
      });

      proc.on("error", (err: Error) => {
        resolve({ success: false, error: formatWindowsCodexCliError(err.message) });
      });

      setTimeout(() => {
        proc.kill();
        resolve({ success: false, error: formatWindowsCodexCliError("Timeout - CLI may not be logged in") });
      }, 60000);
    } catch (err) {
      resolve({ success: false, error: formatWindowsCodexCliError(String(err)) });
    }
  });

  if (!loginCheck.success) {
    return { success: false, stage: "login", error: loginCheck.error || "Please run 'codex' in terminal to log in" };
  }

  return { success: true, stage: "login" };
}
