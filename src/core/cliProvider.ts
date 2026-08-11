/**
 * CLI Provider abstraction layer
 * Allows using Antigravity CLI, Claude CLI, or Codex CLI as chat backend
 *
 * Resolution strategy (Windows):
 * 1. If a custom path is configured, dispatch by extension:
 *      .js  → run via `node`  (shell: false)
 *      .exe → run directly    (shell: false)
 *      else → run via shell   (shell: true) — for `.cmd`/`.bat` wrappers
 * 2. Otherwise auto-detect common executable locations (shell: false).
 * 3. Also auto-detect standalone Claude at `%LOCALAPPDATA%\Programs\claude\claude.exe`.
 * 4. Fall back to `shell: true` + command name (`agy`/`claude`/`codex`) so a
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
  return getNodeModule<typeof import("child_process")>("child_process");
}

function getNodeModule<T>(id: string): T {
  const loader =
    (window as unknown as { require?: (id: string) => unknown }).require ||
    (window as unknown as { module?: { require?: (id: string) => unknown } }).module?.require;
  if (!loader) {
    throw new Error(`${id} is not available in this environment`);
  }
  return loader(id) as T;
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

function dirname(path: string): string | undefined {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (index <= 0) return undefined;
  return path.slice(0, index);
}

function getNonWindowsCliBinCandidates(): string[] {
  if (typeof process === "undefined" || isWindows()) return [];

  const home = process.env?.HOME;
  const candidateDirs: string[] = [];

  if (home) {
    candidateDirs.push(`${home}/.bun/bin`);
    candidateDirs.push(`${home}/.local/bin`);
    candidateDirs.push(`${home}/.npm-global/bin`);
    candidateDirs.push(`${home}/.nodenv/shims`);
    candidateDirs.push(`${home}/.volta/bin`);
    candidateDirs.push(`${home}/.fnm/aliases/default/bin`);
    candidateDirs.push(`${home}/.asdf/shims`);
    candidateDirs.push(`${home}/.local/share/mise/shims`);

    const nvmDir = process.env?.NVM_DIR || `${home}/.nvm`;
    candidateDirs.push(`${nvmDir}/current/bin`);
  }

  candidateDirs.push("/opt/homebrew/bin");
  candidateDirs.push("/usr/local/bin");
  candidateDirs.push("/usr/bin");

  const nodeDir = dirname(findNodeBinary());
  if (nodeDir) {
    candidateDirs.unshift(nodeDir);
  }

  return [...new Set(candidateDirs)];
}

function buildCliEnvironment(): Record<string, string | undefined> | undefined {
  if (typeof process === "undefined") return undefined;

  const env = { ...process.env };
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
  const separator = isWindows() ? ";" : ":";
  const existingPath = env[pathKey] || "";
  const existingDirs = new Set(existingPath.split(separator).filter(Boolean));
  const extraDirs = getNonWindowsCliBinCandidates().filter((dir) => fileExistsSync(dir) && !existingDirs.has(dir));

  if (extraDirs.length > 0) {
    env[pathKey] = [...extraDirs, existingPath].filter(Boolean).join(separator);
  }

  return env;
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

function resolveNonWindowsCustomPath(customPath: string, args: string[]): ResolvedCommand {
  if (customPath.toLowerCase().endsWith(".js")) {
    const node = findNodeBinary();
    return { command: node, args: [customPath, ...args], shell: false };
  }
  return { command: customPath, args, shell: false };
}

/**
 * Resolve the Antigravity CLI command and arguments.
 *
 * @param args - Command line arguments to pass to the CLI
 * @param customPath - Optional custom path to the CLI script/executable
 */
export function resolveAntigravityCommand(args: string[], customPath?: string): ResolvedCommand {
  // If custom path is specified, validate and use it
  if (customPath && validateCustomPath(customPath)) {
    if (isWindows()) {
      return resolveWindowsCustomPath(customPath, args);
    }
    return resolveNonWindowsCustomPath(customPath, args);
  }

  if (isWindows()) {
    if (typeof process !== "undefined") {
      const localAppdata = process.env?.LOCALAPPDATA;
      if (localAppdata) {
        const exePath = `${localAppdata}\\agy\\bin\\agy.exe`;
        if (fileExistsSync(exePath)) {
          return { command: exePath, args, shell: false };
        }
      }
    }
    // Fallback: rely on PATH via cmd.exe so wrappers still work when the
    // standalone exe is not in the default install location.
    return { command: "agy", args, shell: true };
  }

  // Non-Windows: check common installation paths first (Obsidian may not have full PATH)
  if (typeof process !== "undefined") {
    const home = process.env?.HOME;
    const candidatePaths: string[] = [];

    if (home) {
      // Linux/Mac: ~/.local/bin/agy
      candidatePaths.push(`${home}/.local/bin/agy`);
      // npm/global custom prefixes if users symlink there
      candidatePaths.push(`${home}/.npm-global/bin/agy`);
    }

    // Mac: Homebrew paths
    // Apple Silicon
    candidatePaths.push("/opt/homebrew/bin/agy");
    // Intel Mac
    candidatePaths.push("/usr/local/bin/agy");

    for (const path of candidatePaths) {
      if (fileExistsSync(path)) {
        return { command: path, args, shell: false };
      }
    }
  }

  // Fallback: use agy command directly (must be in PATH)
  return { command: "agy", args, shell: false };
}

function formatWindowsCliError(message: string | undefined): string | undefined {
  if (!isWindows()) return message;
  const installHint = "Antigravity CLI not found. Install Antigravity CLI and ensure `agy` is in your PATH.";
  if (!message) return installHint;
  if (
    message.includes("Cannot find module") ||
    message.includes("MODULE_NOT_FOUND") ||
    message.includes("not recognized") ||
    message.includes("cannot find the path") ||
    message.includes("agy") ||
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
      (window as unknown as { require?: (id: string) => unknown }).require ||
      (window as unknown as { module?: { require?: (id: string) => unknown } }).module?.require;
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
export function resolveClaudeCommand(args: string[], customPath?: string): ResolvedCommand {
  // If custom path is specified, validate and use it
  if (customPath && validateCustomPath(customPath)) {
    if (isWindows()) {
      return resolveWindowsCustomPath(customPath, args);
    }
    return resolveNonWindowsCustomPath(customPath, args);
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
export function resolveCodexCommand(args: string[], customPath?: string): ResolvedCommand {
  // If custom path is specified, validate and use it
  if (customPath && validateCustomPath(customPath)) {
    if (isWindows()) {
      return resolveWindowsCustomPath(customPath, args);
    }
    return resolveNonWindowsCustomPath(customPath, args);
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

  // Non-Windows: check common installation paths first (Obsidian may not have full PATH).
  // Bun installs npm globals into ~/.bun/bin by default, which is common on WSL.
  for (const dir of getNonWindowsCliBinCandidates()) {
    const path = `${dir}/codex`;
    if (fileExistsSync(path)) {
      return { command: path, args, shell: false };
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

export interface CodexModelOption {
  slug: string;
  displayName: string;
}

export function parseCodexModelsCatalog(output: string): CodexModelOption[] {
  const parsed = JSON.parse(output) as { models?: unknown };
  if (!Array.isArray(parsed.models)) return [];

  return parsed.models.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const model = entry as Record<string, unknown>;
    if (typeof model.slug !== "string" || !model.slug.trim()) return [];
    if (model.visibility !== undefined && model.visibility !== "list") return [];
    return [{
      slug: model.slug,
      displayName: typeof model.display_name === "string" && model.display_name.trim()
        ? model.display_name
        : model.slug,
    }];
  });
}

/** Read the model catalog exposed by the installed Codex CLI. */
export async function listCodexModels(customPath?: string): Promise<CodexModelOption[]> {
  if (Platform.isMobile) return [];
  const { spawn } = getChildProcess();
  const { command, args, shell } = resolveCodexCommand(["debug", "models"], customPath);

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell,
      env: buildCliEnvironment(),
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.setEncoding("utf8");
    proc.stderr?.setEncoding("utf8");
    proc.stdout?.on("data", (chunk: string) => { stdout += chunk; });
    proc.stderr?.on("data", (chunk: string) => { stderr += chunk; });
    proc.on("error", reject);
    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Codex CLI exited with code ${code}`));
        return;
      }
      try {
        resolve(parseCodexModelsCatalog(stdout));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
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

export function buildCodexExecInvocation(
  messages: Message[],
  systemPrompt: string,
  sessionId?: string,
  model?: string
): { args: string[]; stdin: string } {
  const modelArgs = model?.trim() ? ["--model", model.trim()] : [];
  if (sessionId) {
    const lastMessage = messages[messages.length - 1];
    return {
      args: ["exec", "--json", "--skip-git-repo-check", ...modelArgs, "resume", sessionId, "-"],
      stdin: lastMessage?.role === "user" ? lastMessage.content : "",
    };
  }

  return {
    args: ["exec", "--json", "--skip-git-repo-check", ...modelArgs, "-"],
    stdin: formatHistoryAsPrompt(messages, systemPrompt),
  };
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
          window.setTimeout(() => {
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
 * Antigravity CLI provider
 * Uses: agy --print "prompt"
 * Session resumption: agy --continue --print "prompt"
 */
export class AntigravityCliProvider extends BaseCliProvider {
  name: ChatProvider = "antigravity-cli";
  displayName = "Antigravity CLI";
  supportsSessionResumption = true;

  constructor(private customPath?: string) {
    super();
  }

  protected resolveVersionCommand(): ResolvedCommand {
    return resolveAntigravityCommand(["--version"], this.customPath);
  }

  async *chatStream(
    messages: Message[],
    systemPrompt: string,
    workingDirectory: string,
    signal?: AbortSignal,
    sessionId?: string
  ): AsyncGenerator<StreamChunk> {
    // Dynamically import child_process (not available on mobile)
    const { spawn } = getChildProcess();

    let cliArgs: string[];

    if (sessionId) {
      // Resume session — only send the latest user message
      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage?.role === "user" ? lastMessage.content : "";
      cliArgs = ["--continue", "--print", prompt];
    } else {
      // First message — send full history with system prompt
      const prompt = formatHistoryAsPrompt(messages, systemPrompt);
      cliArgs = ["--print", prompt];
    }

    const { command, args, shell } = resolveAntigravityCommand(cliArgs, this.customPath);

    if (isWindows()) {
      yield* this.runWithFileOutput(command, args, shell, workingDirectory, signal);
      return;
    }

    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell,
      cwd: workingDirectory,
      env: typeof process !== "undefined" ? process.env : undefined,
    });

    // Antigravity print mode receives the prompt via argv, not stdin. Closing
    // stdin prevents the child from waiting for additional input on some shells.
    proc.stdin?.end();

    // Handle abort
    if (signal) {
      signal.addEventListener("abort", () => {
        proc.kill("SIGTERM");
      });
    }

    yield* this.processOutput(proc);
  }

  private async *runWithFileOutput(
    command: string,
    args: string[],
    shell: boolean,
    workingDirectory: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    void shell;
    const result = await this.runWithCmdRedirect(command, args, workingDirectory, signal);

    if (signal?.aborted) {
      throw new Error("Antigravity CLI session aborted");
    }
    if (result.error) {
      yield { type: "error", error: result.error.message };
    } else if (result.code !== 0) {
      yield { type: "error", error: result.stderr.trim() || `Antigravity CLI exited with code ${result.code}` };
    } else if (result.stdout) {
      yield { type: "text", content: result.stdout };
    } else {
      const diagnostics = result.stderr.trim();
      yield {
        type: "error",
        error: diagnostics
          ? `Antigravity CLI returned no response. Diagnostics:\n${diagnostics}`
          : "Antigravity CLI returned no response.",
      };
    }

    yield { type: "done" };
  }

  private quoteCmdArg(value: string): string {
    // cmd.exe parses redirection reliably for agy.exe, but its command string
    // cannot safely contain raw newlines, quotes, or %ENV% patterns.
    const normalized = value
      .replace(/\r?\n/g, " ")
      .replace(/%/g, "^%")
      .replace(/"/g, '""');
    return `"${normalized}"`;
  }

  private async runWithCmdRedirect(
    command: string,
    args: string[],
    workingDirectory: string,
    signal?: AbortSignal
  ): Promise<{ code: number | null; stdout: string; stderr: string; error: Error | null }> {
    const { spawn } = getChildProcess();
    const fs = getNodeModule<typeof import("fs")>("fs");
    const os = getNodeModule<typeof import("os")>("os");
    const path = getNodeModule<typeof import("path")>("path");
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agy-cmd-"));
    const answerPath = path.join(tmpDir, "answer.txt");
    const wrapperPath = path.join(tmpDir, "run.cmd");
    const promptPath = path.join(tmpDir, "prompt.txt");
    const cmdArgs = [...args];
    const promptIndex = cmdArgs.length - 1;
    if (promptIndex >= 0 && cmdArgs[promptIndex]) {
      fs.writeFileSync(promptPath, cmdArgs[promptIndex], "utf8");
      cmdArgs[promptIndex] = [
        "Read the full prompt from",
        `@${promptPath}`,
        "and answer the user's latest request.",
        "For transport back to Obsidian, write only your final answer to this exact file path:",
        answerPath,
        "Do not summarize or describe the prompt file.",
        "Do not write any other files.",
      ].join(" ");
    }
    const agyCommandLine = [
      this.quoteCmdArg(command),
      ...cmdArgs.map(arg => this.quoteCmdArg(arg)),
    ].join(" ");
    fs.writeFileSync(wrapperPath, `@echo off\r\n${agyCommandLine}\r\nexit /b %ERRORLEVEL%\r\n`, "utf8");

    let proc: ChildProcessType | null = null;
    let spawnError: Error | null = null;
    let wrapperStdout = "";
    let wrapperStderr = "";
    const procEnv = typeof process !== "undefined" ? { ...process.env } : undefined;
    if (procEnv) {
      delete procEnv.ELECTRON_RUN_AS_NODE;
    }

    proc = spawn("cmd.exe", ["/d", "/c", wrapperPath], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
      cwd: workingDirectory,
      env: procEnv,
    });
    proc.stdout?.setEncoding("utf8");
    proc.stderr?.setEncoding("utf8");
    proc.stdout?.on("data", (data: string) => {
      wrapperStdout += data;
    });
    proc.stderr?.on("data", (data: string) => {
      wrapperStderr += data;
    });

    if (signal) {
      signal.addEventListener("abort", () => {
        proc?.kill("SIGTERM");
      }, { once: true });
    }

    const code = await new Promise<number | null>((resolve) => {
      proc?.on("close", (closeCode: number | null) => resolve(closeCode));
      proc?.on("error", (err: Error) => {
        spawnError = err;
        resolve(null);
      });
    });

    const stdout = fs.existsSync(answerPath) ? fs.readFileSync(answerPath, "utf8") : "";
    const stderrParts = [
      wrapperStderr,
      wrapperStdout,
    ].filter(Boolean);
    const stderr = stderrParts.join("\n");
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup only.
    }
    return { code, stdout, stderr, error: spawnError };
  }

  private async *processOutput(proc: ChildProcessType): AsyncGenerator<StreamChunk> {
    let stderr = "";
    let sawStdout = false;

    // Drain stderr concurrently. Antigravity can emit verbose diagnostic logs;
    // if nobody reads stderr, the child can block before stdout closes.
    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const closePromise = new Promise<number | null>((resolve, reject) => {
      proc.on("close", (code: number | null) => resolve(code));
      proc.on("error", reject);
    });

    // Process stdout
    if (proc.stdout) {
      proc.stdout.setEncoding("utf8");

      for await (const chunk of proc.stdout) {
        const text = String(chunk);
        if (text.length > 0) {
          sawStdout = true;
        }
        yield { type: "text", content: text };
      }
    }

    // Wait for process to complete
    const code = await closePromise;
    if (code !== 0) {
      const message = stderr.trim() || `Antigravity CLI exited with code ${code}`;
      yield { type: "error", error: message };
    } else if (!sawStdout) {
      const diagnostics = stderr.trim();
      yield {
        type: "error",
        error: diagnostics
          ? `Antigravity CLI returned no response. Diagnostics:\n${diagnostics}`
          : "Antigravity CLI returned no response.",
      };
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
 * Uses: codex exec --json --skip-git-repo-check - with the prompt sent via stdin
 * Supports session resumption with: codex exec resume <sessionId> -
 */
export class CodexCliProvider extends BaseCliProvider {
  name: ChatProvider = "codex-cli";
  displayName = "Codex CLI";
  supportsSessionResumption = true;

  constructor(private model?: string, private customPath?: string) {
    super();
  }

  protected resolveVersionCommand(): ResolvedCommand {
    return resolveCodexCommand(["--version"], this.customPath);
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

    // Build CLI arguments based on whether we have a session ID.
    // Prompt content is sent through stdin so large skill/OKF/RAG contexts do not hit argv limits.
    // Note: --json and --skip-git-repo-check are options for 'exec', must come before subcommands.
    const { args: cliArgs, stdin: prompt } = buildCodexExecInvocation(messages, systemPrompt, sessionId, this.model);

    const { command, args, shell } = resolveCodexCommand(cliArgs, this.customPath);
    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell,
      cwd: workingDirectory,
      env: typeof process !== "undefined" ? process.env : undefined,
    });

    proc.stdin?.end(prompt);

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
 * - Antigravity CLI / Codex CLI: Per-message process spawning with CLI-native
 *   resume flags for session continuity (these CLIs don't support stream-json input).
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
    existingSessionId?: string,
    private codexModel?: string
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
   * Others: spawns a new process with optional CLI-native resume.
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
   * Send via per-message process spawn (Antigravity CLI / Codex CLI).
   */
  private async *sendViaNewProcess(
    allMessages: Message[],
    systemPrompt: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    let provider: CliProviderInterface;
    if (this._providerType === "codex-cli") {
      provider = new CodexCliProvider(this.codexModel, this.customPath);
    } else {
      provider = new AntigravityCliProvider(this.customPath);
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

    // Antigravity CLI doesn't emit session_id in print mode, so store a sentinel.
    // Subsequent messages use `--continue` to resume the most recent conversation.
    if (this._providerType === "antigravity-cli" && !this.sessionId) {
      this.sessionId = "__continue__";
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
    this.providers.set("antigravity-cli", new AntigravityCliProvider());
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
 * Verify Antigravity CLI installation and login status
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
      const { command, args, shell } = resolveAntigravityCommand(["--version"], customPath);
      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell,
        env: buildCliEnvironment(),
      });
      proc.stdin?.end();

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

      window.setTimeout(() => {
        proc.kill();
        resolve({ success: false, error: formatWindowsCliError("Timeout") });
      }, 30000);
    } catch (err) {
      resolve({ success: false, error: formatWindowsCliError(String(err)) });
    }
  });

  if (!versionCheck.success) {
    return { success: false, stage: "version", error: versionCheck.error || "Antigravity CLI not found" };
  }

  // Step 2: Check if logged in (run a simple prompt)
  const loginCheck = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    try {
      const { command, args, shell } = resolveAntigravityCommand(["--print", "Hello"], customPath);
      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell,
        env: buildCliEnvironment(),
      });
      proc.stdin?.end();

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

      window.setTimeout(() => {
        proc.kill();
        resolve({ success: false, error: formatWindowsCliError("Timeout - CLI may not be logged in") });
      }, 30000);
    } catch (err) {
      resolve({ success: false, error: formatWindowsCliError(String(err)) });
    }
  });

  if (!loginCheck.success) {
    return { success: false, stage: "login", error: loginCheck.error || "Please run 'agy' in terminal to log in" };
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
        env: buildCliEnvironment(),
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

      window.setTimeout(() => {
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
        env: buildCliEnvironment(),
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

      window.setTimeout(() => {
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
        env: buildCliEnvironment(),
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

      window.setTimeout(() => {
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
        env: buildCliEnvironment(),
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

      window.setTimeout(() => {
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
