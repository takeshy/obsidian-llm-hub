import { useEffect, useRef, useState } from "react";
import { Notice, Platform } from "obsidian";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { IPty } from "node-pty";
import type { LlmHubPlugin } from "src/plugin";
import {
  DEFAULT_CLI_CONFIG,
  type ChatProvider,
  type ModelType,
} from "src/types";
import { resolveClaudeCommand } from "src/core/cliProvider";
import { formatError } from "obsidian-llm-hub-common/core";

type NodePtyModule = typeof import("node-pty");
export type TerminalProvider = Extract<ChatProvider, "claude-cli">;

declare const require: ((moduleId: string) => unknown) | undefined;

type ModelOption = {
  name: ModelType;
  displayName: string;
  description?: string;
};

const PROVIDER_LABELS: Record<TerminalProvider, string> = {
  "claude-cli": "Claude CLI",
};

function getNodeModule<T>(id: string): T {
  const loader =
    (typeof require === "function" ? require : undefined) ||
    (window as unknown as { require?: (moduleId: string) => unknown }).require ||
    (window as unknown as { module?: { require?: (moduleId: string) => unknown } }).module?.require;
  if (!loader) throw new Error("CommonJS require is not available");
  return loader(id) as T;
}

function getPluginNodeModule<T>(plugin: LlmHubPlugin, id: string): T {
  try {
    return getNodeModule<T>(id);
  } catch (firstError) {
    const loader =
      (typeof require === "function" ? require : undefined) ||
      (window as unknown as { require?: (moduleId: string) => unknown }).require ||
      (window as unknown as { module?: { require?: (moduleId: string) => unknown } }).module?.require;
    if (!loader) throw firstError;

    const vaultBasePath = (plugin.app.vault.adapter as { basePath?: string }).basePath;
    const pluginsDir = `${plugin.app.vault.configDir}/plugins`;
    const pluginDir = (plugin.manifest as { dir?: string; id?: string }).dir || plugin.manifest.id;
    if (!vaultBasePath || !pluginDir) throw firstError;

    const isAbsolutePluginDir = /^(?:[A-Za-z]:[\\/]|[\\/])/.test(pluginDir);
    const includesPluginRoot = pluginDir.includes(pluginsDir) || pluginDir.includes(pluginsDir.replace(/\//g, "\\"));
    const candidatePaths = [
      isAbsolutePluginDir ? `${pluginDir}/node_modules/${id}` : "",
      includesPluginRoot ? `${vaultBasePath}/${pluginDir}/node_modules/${id}` : "",
      `${vaultBasePath}/${pluginsDir}/${pluginDir}/node_modules/${id}`,
      `${vaultBasePath}/${pluginsDir}/${plugin.manifest.id}/node_modules/${id}`,
    ].filter((path, index, paths): path is string => path.length > 0 && paths.indexOf(path) === index);

    const errors: string[] = [];
    for (const localModulePath of candidatePaths) {
      try {
        return loader(localModulePath) as T;
      } catch (error) {
        errors.push(`Fallback path failed: ${localModulePath}\n${formatError(error)}`);
      }
    }
    throw new Error(`${formatError(firstError)}\n${errors.join("\n")}`);
  }
}

function getPluginDirectory(plugin: LlmHubPlugin): string | undefined {
  const vaultBasePath = (plugin.app.vault.adapter as { basePath?: string }).basePath;
  const pluginsDir = `${plugin.app.vault.configDir}/plugins`;
  const pluginDir = (plugin.manifest as { dir?: string; id?: string }).dir || plugin.manifest.id;
  if (!vaultBasePath || !pluginDir) return undefined;

  const fs = getNodeModule<typeof import("fs")>("fs");
  const isAbsolutePluginDir = /^(?:[A-Za-z]:[\\/]|[\\/])/.test(pluginDir);
  const includesPluginRoot = pluginDir.includes(pluginsDir) || pluginDir.includes(pluginsDir.replace(/\//g, "\\"));
  const candidateDirs = [
    isAbsolutePluginDir ? pluginDir : "",
    includesPluginRoot ? `${vaultBasePath}/${pluginDir}` : "",
    `${vaultBasePath}/${pluginsDir}/${pluginDir}`,
    `${vaultBasePath}/${pluginsDir}/${plugin.manifest.id}`,
  ].filter((path, index, paths): path is string => path.length > 0 && paths.indexOf(path) === index);

  return candidateDirs.find((dir) => fs.existsSync(`${dir}/package.json`)) || candidateDirs.find((dir) => fs.existsSync(dir));
}

export function isTerminalProvider(model: ModelType): model is TerminalProvider {
  return model === "claude-cli";
}

function getFirstVerifiedProvider(plugin: LlmHubPlugin): TerminalProvider | null {
  const config = plugin.settings.cliConfig || DEFAULT_CLI_CONFIG;
  if (config.claudeCliVerified) return "claude-cli";
  return null;
}

function asPtyCommand(command: string, args: string[], useShell: boolean): { command: string; args: string[] } {
  if (!useShell) return { command, args };
  if (typeof process !== "undefined" && process.platform === "win32") {
    return { command: "cmd.exe", args: ["/d", "/s", "/c", [command, ...args].join(" ")] };
  }
  return { command: process.env.SHELL || "sh", args: ["-lc", [command, ...args].join(" ")] };
}

export interface CliTerminalPanelProps {
  plugin: LlmHubPlugin;
  provider?: TerminalProvider;
  availableModels?: ModelOption[];
  onModelChange?: (model: ModelType) => void;
  onBackToChat?: () => void;
  showProviderButtons?: boolean;
}

export default function CliTerminalPanel({
  plugin,
  provider,
  availableModels,
  onModelChange,
  onBackToChat,
  showProviderButtons = false,
}: CliTerminalPanelProps) {
  const terminalHostRef = useRef<HTMLDivElement | null>(null);
  const ptyRef = useRef<IPty | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [activeProvider, setActiveProvider] = useState<TerminalProvider | null>(
    provider ?? getFirstVerifiedProvider(plugin)
  );
  const [status, setStatus] = useState("Select Claude CLI to start a TTY session in the vault root.");
  const [terminalRuntimeMissing, setTerminalRuntimeMissing] = useState(false);
  const [installingRuntime, setInstallingRuntime] = useState(false);
  const [installAttempt, setInstallAttempt] = useState(0);
  const isWindowsRuntime = typeof process !== "undefined" && process.platform === "win32";

  useEffect(() => {
    if (provider && provider !== activeProvider) {
      setActiveProvider(provider);
    }
  }, [provider, activeProvider]);

  useEffect(() => {
    if (!activeProvider || !terminalHostRef.current) return;

    if (Platform.isMobile) {
      const message = "CLI terminal is available on desktop only.";
      setStatus(message);
      new Notice(message);
      return;
    }

    if (isWindowsRuntime) {
      const terminalHost = terminalHostRef.current;
      terminalHost.textContent = "";
      setTerminalRuntimeMissing(false);
      setStatus("Embedded CLI terminal is not available on Windows Obsidian. Open the CLI in an external terminal instead.");
      return;
    }

    let ptyModule: NodePtyModule;
    try {
      ptyModule = getPluginNodeModule<NodePtyModule>(plugin, "node-pty");
      setTerminalRuntimeMissing(false);
    } catch (e) {
      const details = formatError(e);
      const message = `node-pty is required for full embedded TTY sessions. Install dependencies and rebuild the plugin.\n\n${details}`;
      setTerminalRuntimeMissing(true);
      setStatus(message);
      new Notice(message);
      console.error("LLM Hub: Failed to load CLI terminal runtime:", details);
      return;
    }

    const terminalHost = terminalHostRef.current;
    terminalHost.textContent = "";

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "var(--font-monospace)",
      fontSize: 12,
      theme: {
        background: "#000000",
        foreground: "#f2f2f2",
        cursor: "#ffffff",
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalHost);
    fitAddon.fit();

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // The terminal may be detached while the resize callback is queued.
      }
    });
    resizeObserver.observe(terminalHost);

    const config = plugin.settings.cliConfig || DEFAULT_CLI_CONFIG;
    const customPath = config.claudeCliPath;
    const resolved = resolveClaudeCommand([], customPath);
    const cwd = (plugin.app.vault.adapter as { basePath?: string }).basePath || ".";
    const dimensions = fitAddon.proposeDimensions() || { cols: 120, rows: 30 };
    const env = { ...(typeof process !== "undefined" ? process.env : {}), VAULT_PATH: cwd } as Record<string, string>;
    const shellCommand = asPtyCommand(resolved.command, resolved.args, resolved.shell);

    setStatus(`Running ${PROVIDER_LABELS[activeProvider]} in ${cwd}`);
    terminal.writeln(`$ ${resolved.command}${resolved.args.length ? ` ${resolved.args.join(" ")}` : ""}`);

    const pty = ptyModule.spawn(shellCommand.command, shellCommand.args, {
      name: "xterm-256color",
      cols: dimensions.cols,
      rows: dimensions.rows,
      cwd,
      env,
    });

    terminal.onData((data) => pty.write(data));
    pty.onData((data) => terminal.write(data));
    pty.onExit(({ exitCode, signal }) => {
      terminal.writeln(`\r\n[${PROVIDER_LABELS[activeProvider]} exited with code ${exitCode}${signal ? `, signal ${signal}` : ""}]`);
      ptyRef.current = null;
      setStatus(`Stopped ${PROVIDER_LABELS[activeProvider]}`);
    });

    ptyRef.current = pty;
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    resizeObserverRef.current = resizeObserver;
    terminal.focus();

    return () => {
      resizeObserver.disconnect();
      try {
        pty.kill();
      } catch (e) {
        console.error("LLM Hub: Failed to kill CLI terminal:", formatError(e));
      }
      fitAddon.dispose();
      terminal.dispose();
      ptyRef.current = null;
      terminalRef.current = null;
      fitAddonRef.current = null;
      resizeObserverRef.current = null;
    };
  }, [activeProvider, plugin, isWindowsRuntime, installAttempt]);

  const quoteCmdArg = (value: string): string => `"${value.replace(/"/g, '""')}"`;

  const launchExternalTerminal = () => {
    if (!activeProvider) return;
    try {
      const { spawn } = getNodeModule<typeof import("child_process")>("child_process");
      const fs = getNodeModule<typeof import("fs")>("fs");
      const os = getNodeModule<typeof import("os")>("os");
      const path = getNodeModule<typeof import("path")>("path");
      const config = plugin.settings.cliConfig || DEFAULT_CLI_CONFIG;
      const customPath = config.claudeCliPath;
      const resolved = resolveClaudeCommand([], customPath);
      const cwd = (plugin.app.vault.adapter as { basePath?: string }).basePath || ".";
      const commandLine = [resolved.command, ...resolved.args].map(quoteCmdArg).join(" ");
      const scriptPath = path.join(os.tmpdir(), `llm-hub-${activeProvider}-${Date.now()}.cmd`);
      fs.writeFileSync(
        scriptPath,
        [
          "@echo off",
          `cd /d ${quoteCmdArg(cwd)}`,
          commandLine,
          "",
        ].join("\r\n"),
        "utf8",
      );
      spawn("cmd.exe", ["/d", "/c", "start", "", "cmd.exe", "/k", "call", scriptPath], {
        cwd,
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      }).unref();
      setStatus(`Opened ${PROVIDER_LABELS[activeProvider]} in an external terminal.`);
    } catch (e) {
      const details = formatError(e);
      setStatus(`Failed to open external terminal.\n\n${details}`);
      new Notice(`Failed to open external terminal: ${details}`);
      console.error("LLM Hub: Failed to open external CLI terminal:", details);
    }
  };

  const installTerminalRuntime = () => {
    if (installingRuntime || isWindowsRuntime) return;

    try {
      const pluginDir = getPluginDirectory(plugin);
      if (!pluginDir) {
        const message = "Plugin directory was not found. Install dependencies manually in the plugin folder.";
        setStatus(message);
        new Notice(message);
        return;
      }

      const { spawn } = getNodeModule<typeof import("child_process")>("child_process");
      setInstallingRuntime(true);
      setStatus(`Installing terminal dependencies in ${pluginDir}...`);

      const proc = spawn("npm", ["install", "--omit=dev", "--include=optional"], {
        cwd: pluginDir,
        env: typeof process !== "undefined" ? process.env : undefined,
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
      });

      let output = "";
      const appendOutput = (data: Uint8Array) => {
        output = `${output}${new TextDecoder().decode(data)}`.slice(-4000);
      };
      proc.stdout?.on("data", appendOutput);
      proc.stderr?.on("data", appendOutput);

      proc.on("error", (error: Error) => {
        const details = formatError(error);
        setInstallingRuntime(false);
        setStatus(`Failed to start npm install.\n\n${details}`);
        new Notice(`Failed to start npm install: ${details}`);
      });

      proc.on("close", (code: number | null) => {
        setInstallingRuntime(false);
        if (code === 0) {
          setTerminalRuntimeMissing(false);
          setStatus("Terminal dependencies installed. Restart Obsidian or reload the plugin if the terminal does not start automatically.");
          new Notice("Terminal dependencies installed.");
          setInstallAttempt((value) => value + 1);
          return;
        }
        const details = output.trim() || `Exit code: ${code}`;
        setStatus(`Failed to install terminal dependencies.\n\n${details}`);
        new Notice("Failed to install terminal dependencies. Check the console for details.");
        console.error("LLM Hub: Failed to install terminal dependencies:", details);
      });
    } catch (e) {
      const details = formatError(e);
      setInstallingRuntime(false);
      setStatus(`Failed to install terminal dependencies.\n\n${details}`);
      new Notice(`Failed to install terminal dependencies: ${details}`);
    }
  };

  const stopTerminal = () => {
    if (ptyRef.current) {
      try {
        ptyRef.current.kill();
      } catch (e) {
        console.error("LLM Hub: Failed to kill CLI terminal:", formatError(e));
      }
      ptyRef.current = null;
    }
    if (activeProvider) {
      setStatus(`Stopped ${PROVIDER_LABELS[activeProvider]}`);
    }
  };

  const clearTerminal = () => {
    terminalRef.current?.write("\x1b[2J\x1b[H");
  };

  return (
    <div className="llm-hub-cli-terminal-container">
      <div className="llm-hub-cli-terminal-toolbar">
        <span className="llm-hub-cli-terminal-status">{status}</span>
        <div className="llm-hub-cli-terminal-buttons">
          {availableModels && onModelChange && (
            <select
              className="llm-hub-cli-terminal-model-select"
              value={provider ?? activeProvider ?? ""}
              onChange={(e) => onModelChange(e.target.value as ModelType)}
            >
              {availableModels.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.displayName}
                </option>
              ))}
            </select>
          )}
          {showProviderButtons && (Object.keys(PROVIDER_LABELS) as TerminalProvider[]).map((candidate) => (
            <button
              key={candidate}
              className={candidate === activeProvider ? "mod-cta" : undefined}
              onClick={() => setActiveProvider(candidate)}
            >
              {PROVIDER_LABELS[candidate]}
            </button>
          ))}
          {onBackToChat && (
            <button onClick={onBackToChat}>Back to chat</button>
          )}
          {isWindowsRuntime ? (
            <button className="mod-cta" onClick={launchExternalTerminal}>Open external terminal</button>
          ) : terminalRuntimeMissing ? (
            <button className="mod-cta" onClick={installTerminalRuntime} disabled={installingRuntime}>
              {installingRuntime ? "Installing..." : "Install terminal dependencies"}
            </button>
          ) : (
            <>
              <button className="mod-warning" onClick={stopTerminal}>Stop</button>
              <button onClick={clearTerminal}>Clear</button>
            </>
          )}
        </div>
      </div>
      <div className="llm-hub-cli-terminal-host" ref={terminalHostRef}>
        {isWindowsRuntime && (
          <div className="llm-hub-cli-terminal-fallback">
            <div>Embedded TTY sessions cannot run inside Windows Obsidian.</div>
            <button className="mod-cta" onClick={launchExternalTerminal}>Open external terminal</button>
          </div>
        )}
        {!isWindowsRuntime && terminalRuntimeMissing && (
          <div className="llm-hub-cli-terminal-fallback">
            <div>node-pty is required for embedded Claude CLI terminal sessions.</div>
            <button className="mod-cta" onClick={installTerminalRuntime} disabled={installingRuntime}>
              {installingRuntime ? "Installing..." : "Install terminal dependencies"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
