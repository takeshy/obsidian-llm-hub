import { ItemView, Notice, Platform, WorkspaceLeaf, type IconName } from "obsidian";
import type { IPty } from "node-pty";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import type { ChatProvider } from "src/types";
import type { LlmHubPlugin } from "src/plugin";
import { DEFAULT_CLI_CONFIG } from "src/types";
import {
  resolveAntigravityCommand,
  resolveClaudeCommand,
  resolveCodexCommand,
} from "src/core/cliProvider";
import { formatError } from "src/utils/error";

export const CLI_TERMINAL_VIEW_TYPE = "llm-hub-cli-terminal-view";

type NodePtyModule = typeof import("node-pty");
type XtermModule = typeof import("@xterm/xterm");
type XtermFitModule = typeof import("@xterm/addon-fit");
type TerminalProvider = Extract<ChatProvider, "antigravity-cli" | "claude-cli" | "codex-cli">;

const PROVIDER_LABELS: Record<TerminalProvider, string> = {
  "antigravity-cli": "Antigravity CLI",
  "claude-cli": "Claude CLI",
  "codex-cli": "Codex CLI",
};

export class CliTerminalView extends ItemView {
  private plugin: LlmHubPlugin;
  private pty: IPty | null = null;
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private terminalHostEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private activeProvider: TerminalProvider | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: LlmHubPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return CLI_TERMINAL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "LLM Hub CLI Terminal";
  }

  getIcon(): IconName {
    return "terminal";
  }

  async onOpen(): Promise<void> {
    await Promise.resolve();
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("llm-hub-cli-terminal-container");

    const toolbar = container.createDiv({ cls: "llm-hub-cli-terminal-toolbar" });
    this.statusEl = toolbar.createSpan({ cls: "llm-hub-cli-terminal-status", text: "Select a CLI to start a TTY session in the vault root." });

    const buttonGroup = toolbar.createDiv({ cls: "llm-hub-cli-terminal-buttons" });
    this.addProviderButton(buttonGroup, "antigravity-cli");
    this.addProviderButton(buttonGroup, "claude-cli");
    this.addProviderButton(buttonGroup, "codex-cli");
    buttonGroup.createEl("button", { text: "Stop", cls: "mod-warning" }).addEventListener("click", () => this.stopTerminal());
    buttonGroup.createEl("button", { text: "Clear" }).addEventListener("click", () => this.terminal?.write("\x1b[2J\x1b[H"));

    this.terminalHostEl = container.createDiv({ cls: "llm-hub-cli-terminal-host" });

    const firstProvider = this.getFirstVerifiedProvider();
    if (firstProvider) {
      this.startTerminal(firstProvider);
    }
  }

  async onClose(): Promise<void> {
    this.stopTerminal();
    this.disposeTerminalUi();
    await Promise.resolve();
  }

  openProvider(provider: TerminalProvider): void {
    this.startTerminal(provider);
  }

  private addProviderButton(container: HTMLElement, provider: TerminalProvider): void {
    const button = container.createEl("button", { text: PROVIDER_LABELS[provider] });
    button.addEventListener("click", () => {
      this.startTerminal(provider);
    });
  }

  private getFirstVerifiedProvider(): TerminalProvider | null {
    const config = this.plugin.settings.cliConfig || DEFAULT_CLI_CONFIG;
    if (config.cliVerified) return "antigravity-cli";
    if (config.claudeCliVerified) return "claude-cli";
    if (config.codexCliVerified) return "codex-cli";
    return null;
  }

  private startTerminal(provider: TerminalProvider): void {
    if (Platform.isMobile) {
      new Notice("CLI terminal is available on desktop only.");
      return;
    }
    if (!this.terminalHostEl) return;

    let ptyModule: NodePtyModule;
    let xtermModule: XtermModule;
    let fitModule: XtermFitModule;
    try {
      ptyModule = this.getNodeModule<NodePtyModule>("node-pty");
      xtermModule = this.getNodeModule<XtermModule>("@xterm/xterm");
      fitModule = this.getNodeModule<XtermFitModule>("@xterm/addon-fit");
    } catch (e) {
      const message = "node-pty and @xterm/xterm are required for full embedded TTY sessions. Install dependencies and rebuild the plugin.";
      this.setStatus(message);
      new Notice(message);
      console.error("LLM Hub: Failed to load CLI terminal runtime:", formatError(e));
      return;
    }

    this.stopTerminal();
    this.disposeTerminalUi();
    this.terminalHostEl.empty();

    this.terminal = new xtermModule.Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "var(--font-monospace)",
      fontSize: 12,
      theme: {
        background: "#00000000",
        foreground: "#dcddde",
        cursor: "#ffffff",
      },
    });
    this.fitAddon = new fitModule.FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.terminalHostEl);
    this.fitTerminal();
    this.resizeObserver = new ResizeObserver(() => this.fitTerminal());
    this.resizeObserver.observe(this.terminalHostEl);

    const config = this.plugin.settings.cliConfig || DEFAULT_CLI_CONFIG;
    const customPath = provider === "antigravity-cli"
      ? config.geminiCliPath
      : provider === "claude-cli"
        ? config.claudeCliPath
        : config.codexCliPath;
    const resolved = provider === "antigravity-cli"
      ? resolveAntigravityCommand([], customPath)
      : provider === "claude-cli"
        ? resolveClaudeCommand([], customPath)
        : resolveCodexCommand([], customPath);
    const cwd = (this.plugin.app.vault.adapter as { basePath?: string }).basePath || ".";
    const dimensions = this.fitAddon.proposeDimensions() || { cols: 120, rows: 30 };

    this.activeProvider = provider;
    this.setStatus(`Running ${PROVIDER_LABELS[provider]} in ${cwd}`);
    this.terminal.writeln(`$ ${resolved.command}${resolved.args.length ? ` ${resolved.args.join(" ")}` : ""}`);

    const env = { ...(typeof process !== "undefined" ? process.env : {}), VAULT_PATH: cwd } as Record<string, string>;
    const shellCommand = this.asPtyCommand(resolved.command, resolved.args, resolved.shell);
    this.pty = ptyModule.spawn(shellCommand.command, shellCommand.args, {
      name: "xterm-256color",
      cols: dimensions.cols,
      rows: dimensions.rows,
      cwd,
      env,
    });

    this.terminal.onData((data) => this.pty?.write(data));
    this.pty.onData((data) => this.terminal?.write(data));
    this.pty.onExit(({ exitCode, signal }) => {
      this.terminal?.writeln(`\r\n[${PROVIDER_LABELS[provider]} exited with code ${exitCode}${signal ? `, signal ${signal}` : ""}]`);
      this.pty = null;
      this.setStatus(`Stopped ${PROVIDER_LABELS[provider]}`);
    });
    this.terminal.focus();
  }

  private stopTerminal(): void {
    if (this.pty) {
      try {
        this.pty.kill();
      } catch (e) {
        console.error("LLM Hub: Failed to kill CLI terminal:", formatError(e));
      }
      this.pty = null;
    }
    if (this.activeProvider) {
      this.setStatus(`Stopped ${PROVIDER_LABELS[this.activeProvider]}`);
    }
    this.activeProvider = null;
  }

  private disposeTerminalUi(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.fitAddon?.dispose();
    this.fitAddon = null;
    this.terminal?.dispose();
    this.terminal = null;
  }

  private fitTerminal(): void {
    try {
      this.fitAddon?.fit();
    } catch (e) {
      console.debug("LLM Hub: Failed to fit CLI terminal:", formatError(e));
    }
  }

  private setStatus(text: string): void {
    if (this.statusEl) this.statusEl.setText(text);
  }

  private getNodeModule<T>(id: string): T {
    const loader =
      (globalThis as unknown as { require?: (moduleId: string) => unknown }).require ||
      (globalThis as unknown as { module?: { require?: (moduleId: string) => unknown } }).module?.require;
    if (!loader) throw new Error("CommonJS require is not available");
    return loader(id) as T;
  }

  private asPtyCommand(command: string, args: string[], useShell: boolean): { command: string; args: string[] } {
    if (!useShell) return { command, args };
    if (typeof process !== "undefined" && process.platform === "win32") {
      return { command: "cmd.exe", args: ["/d", "/s", "/c", [command, ...args].join(" ")] };
    }
    return { command: process.env.SHELL || "sh", args: ["-lc", [command, ...args].join(" ")] };
  }
}
