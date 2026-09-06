import { joinCommandLine, normalizeSpawnCommand, splitCommandLine } from "src/core/commandLine";
import { Modal, Setting, Notice, Platform } from "obsidian";
import type { McpServerConfig, McpTransport, McpFraming } from "src/types";
import { createMcpClient } from "src/core/mcpClient";
import { credentialSlot } from "src/core/credentialBundle";
import { markCredentialConfiguredElsewhere } from "./credentialStorageSettings";
import { formatError } from "obsidian-llm-hub-common/core";
import { t } from "src/i18n";
import type { LlmHubPlugin } from "src/plugin";

function parseStringRecord(json: string): Record<string, string> {
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object");
  }
  const entries = Object.entries(parsed);
  if (!entries.every((entry): entry is [string, string] => typeof entry[1] === "string")) {
    throw new Error("Expected string values");
  }
  return Object.fromEntries(entries);
}

export class McpServerModal extends Modal {
  private server: McpServerConfig;
  private isNew: boolean;
  private onSubmit: (server: McpServerConfig) => void | Promise<void>;
  private headersText = "";
  private envText = "";
  private argsText = "";
  private connectionTested = false;
  private busy = false;
  private testClient: ReturnType<typeof createMcpClient> | null = null;
  private saveBtn: import("obsidian").ButtonComponent | null = null;
  private testRequiredEl: HTMLElement | null = null;
  // Container elements for conditional field visibility
  private httpFieldsEl: HTMLElement | null = null;
  private stdioFieldsEl: HTMLElement | null = null;

  private invalidateConnectionTest() {
    this.connectionTested = false;
    this.server.toolHints = undefined;
    if (this.saveBtn) this.saveBtn.setDisabled(true);
    if (this.testRequiredEl) this.testRequiredEl.removeClass("llm-hub-hidden");
  }

  constructor(
    private plugin: LlmHubPlugin,
    server: McpServerConfig | null,
    onSubmit: (server: McpServerConfig) => void | Promise<void>
  ) {
    super(plugin.app);
    this.isNew = server === null;
    // For existing servers with toolHints, consider connection already tested
    this.connectionTested = server !== null && Array.isArray(server.toolHints) && server.toolHints.length > 0;
    this.server = server
      ? { ...server, allowedTools: [...(server.allowedTools ?? [])] }
      : {
          name: "",
          transport: "http",
          url: "",
          headers: undefined,
          enabled: true,
          toolHints: undefined,
        };
    this.headersText = this.server.headers ? JSON.stringify(this.server.headers, null, 2) : "";
    this.envText = this.server.env ? JSON.stringify(this.server.env, null, 2) : "";
    this.argsText = joinCommandLine(this.server.args || []);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", {
      text: this.isNew ? t("settings.createMcpServer") : t("settings.editMcpServer"),
    });

    // Server name
    new Setting(contentEl)
      .setName(t("settings.mcpServerName"))
      .addText((text) => {
        text
          .setPlaceholder(t("settings.mcpServerName.placeholder"))
          .setValue(this.server.name)
          .onChange((value) => {
            this.server.name = value;
          });
        text.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
          }
        });
      });

    new Setting(contentEl)
      .setName(t("settings.mcpAutoApprove"))
      .setDesc(t("settings.mcpAutoApprove.desc"))
      .addToggle(toggle => toggle.setValue(this.server.autoApprove ?? false)
        .onChange(value => { this.server.autoApprove = value; }));

    const allowedEl = contentEl.createDiv();
    const renderAllowedTools = () => {
      allowedEl.empty();
      new Setting(allowedEl).setName(t("settings.mcpAllowedTools")).setDesc(t("settings.mcpAllowedTools.desc"));
      for (const tool of this.server.allowedTools ?? []) {
        new Setting(allowedEl).setName(tool).addExtraButton(btn => btn
          .setIcon("trash").setTooltip(t("common.delete"))
          .onClick(() => {
            this.server.allowedTools = this.server.allowedTools?.filter(name => name !== tool);
            renderAllowedTools();
          }));
      }
    };
    renderAllowedTools();

    // Transport selector
    const transportSetting = new Setting(contentEl)
      .setName(t("settings.mcpTransport"));

    transportSetting.addDropdown((dropdown) => {
      dropdown.addOption("http", t("settings.mcpTransport.http"));
      if (!Platform.isMobile) {
        dropdown.addOption("stdio", t("settings.mcpTransport.stdio"));
      }
      dropdown.setValue(this.server.transport || "http");
      dropdown.onChange((value) => {
        this.server.transport = value as McpTransport;
        this.invalidateConnectionTest();
        this.updateFieldVisibility();
      });
    });

    if (Platform.isMobile) {
      const mobileNote = contentEl.createDiv({ cls: "setting-item-description" });
      mobileNote.setText(t("settings.mcpTransport.stdioDesktopOnly"));
    }

    // --- HTTP fields ---
    this.httpFieldsEl = contentEl.createDiv();

    // Server URL
    new Setting(this.httpFieldsEl)
      .setName(t("settings.mcpServerUrl"))
      .addText((text) => {
        text
          .setPlaceholder(t("settings.mcpServerUrl.placeholder"))
          .setValue(this.server.url ?? "")
          .onChange((value) => {
            this.server.url = value;
            this.invalidateConnectionTest();
          });
      });

    // Headers (JSON)
    const headersSetting = new Setting(this.httpFieldsEl)
      .setName(t("settings.mcpServerHeaders"))
      .setDesc(t("settings.mcpServerHeaders.desc"));

    headersSetting.settingEl.addClass("llm-hub-settings-textarea-container");

    headersSetting.addTextArea((text) => {
      text
        .setPlaceholder(t("settings.mcpServerHeaders.placeholder"))
        .setValue(this.headersText)
        .onChange((value) => {
          this.headersText = value;
          this.invalidateConnectionTest();
        });
      text.inputEl.rows = 3;
      text.inputEl.addClass("llm-hub-settings-textarea");
    });

    markCredentialConfiguredElsewhere(
      headersSetting,
      this.plugin,
      credentialSlot.mcpHeaders(this.server),
      this.headersText,
    );

    // --- Stdio fields ---
    this.stdioFieldsEl = contentEl.createDiv();

    // Command
    new Setting(this.stdioFieldsEl)
      .setName(t("settings.mcpServerCommand"))
      .addText((text) => {
        text
          .setPlaceholder(t("settings.mcpServerCommand.placeholder"))
          .setValue(this.server.command || "")
          .onChange((value) => {
            this.server.command = value;
            this.invalidateConnectionTest();
          });
      });

    // Arguments
    new Setting(this.stdioFieldsEl)
      .setName(t("settings.mcpServerArgs"))
      .addText((text) => {
        text
          .setPlaceholder(t("settings.mcpServerArgs.placeholder"))
          .setValue(this.argsText)
          .onChange((value) => {
            this.argsText = value;
            this.invalidateConnectionTest();
          });
      });

    // Framing protocol
    new Setting(this.stdioFieldsEl)
      .setName(t("settings.mcpServerFraming"))
      .addDropdown((dropdown) => {
        dropdown.addOption("content-length", t("settings.mcpServerFraming.contentLength"));
        dropdown.addOption("newline", t("settings.mcpServerFraming.newline"));
        dropdown.setValue(this.server.framing || "newline");
        dropdown.onChange((value) => {
          this.server.framing = value as McpFraming;
          this.invalidateConnectionTest();
        });
      });

    // Environment variables (JSON)
    const envSetting = new Setting(this.stdioFieldsEl)
      .setName(t("settings.mcpServerEnv"))
      .setDesc(t("settings.mcpServerEnv.desc"));

    envSetting.settingEl.addClass("llm-hub-settings-textarea-container");

    envSetting.addTextArea((text) => {
      text
        .setPlaceholder(t("settings.mcpServerEnv.placeholder"))
        .setValue(this.envText)
        .onChange((value) => {
          this.envText = value;
          this.invalidateConnectionTest();
        });
      text.inputEl.rows = 3;
      text.inputEl.addClass("llm-hub-settings-textarea");
    });

    markCredentialConfiguredElsewhere(
      envSetting,
      this.plugin,
      credentialSlot.mcpEnv(this.server),
      this.envText,
    );

    // Set initial field visibility
    this.updateFieldVisibility();

    // Test connection button
    const testSetting = new Setting(contentEl);
    const testStatusEl = testSetting.controlEl.createDiv({ cls: "llm-hub-mcp-test-status" });

    testSetting.addButton((btn) =>
      btn
        .setButtonText(t("settings.testMcpConnection"))
        .onClick(() => {
          void this.testConnection(testStatusEl, btn.buttonEl);
        })
    );

    // Test required message
    this.testRequiredEl = contentEl.createDiv({ cls: "llm-hub-mcp-test-required" });
    this.testRequiredEl.setText(t("settings.testConnectionRequired"));
    if (this.connectionTested) {
      this.testRequiredEl.addClass("llm-hub-hidden");
    }

    // Action buttons
    const actionSetting = new Setting(contentEl);
    actionSetting.addButton((btn) =>
      btn.setButtonText(t("common.cancel")).onClick(() => this.close())
    );
    actionSetting.addButton((btn) => {
      this.saveBtn = btn;
      btn
        .setButtonText(this.isNew ? t("common.create") : t("common.save"))
        .setCta()
        .onClick(() => {
          if (this.busy) return;
          if (!this.server.name.trim()) {
            new Notice(t("settings.mcpServerNameRequired"));
            return;
          }

          if (this.server.transport === "stdio") {
            if (!this.server.command?.trim()) {
              new Notice(t("settings.mcpServerCommandRequired"));
              return;
            }
          } else {
            if (!this.server.url?.trim()) {
              new Notice(t("settings.mcpServerUrlRequired"));
              return;
            }
          }

          if (!this.connectionTested) {
            new Notice(t("settings.testConnectionRequired"));
            return;
          }

          // Parse transport-specific fields
          if (this.server.transport === "stdio") {
            this.server.args = splitCommandLine(this.argsText);
            // Parse env
            if (this.envText.trim()) {
              try {
                this.server.env = parseStringRecord(this.envText);
              } catch {
                new Notice(t("settings.mcpServerInvalidEnv"));
                return;
              }
            } else {
              this.server.env = undefined;
            }
          } else {
            // Parse headers
            if (this.headersText.trim()) {
              try {
                this.server.headers = parseStringRecord(this.headersText);
              } catch {
                new Notice(t("settings.mcpServerInvalidHeaders"));
                return;
              }
            } else {
              this.server.headers = undefined;
            }
          }

          void this.saveServer(testStatusEl);
        });
      // Disable save button if connection not tested
      btn.setDisabled(!this.connectionTested);
    });
  }

  private updateFieldVisibility() {
    if (!this.httpFieldsEl || !this.stdioFieldsEl) return;
    if (this.server.transport === "stdio") {
      this.httpFieldsEl.addClass("llm-hub-hidden");
      this.stdioFieldsEl.removeClass("llm-hub-hidden");
    } else {
      this.httpFieldsEl.removeClass("llm-hub-hidden");
      this.stdioFieldsEl.addClass("llm-hub-hidden");
    }
  }

  private lockControls(): () => void {
    this.busy = true;
    const controls = Array.from(this.contentEl.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>("input, button, select, textarea"));
    const disabled = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    return () => {
      controls.forEach((control, i) => { control.disabled = disabled[i]; });
      this.busy = false;
      this.saveBtn?.setDisabled(!this.connectionTested);
    };
  }

  private async saveServer(statusEl: HTMLElement): Promise<void> {
    const unlock = this.lockControls();
    try {
      const config = this.server.transport === "stdio"
        ? { ...this.server, ...normalizeSpawnCommand(this.server.command!, this.server.args || []) }
        : this.server;
      await this.onSubmit(config);
      this.close();
    } catch (error) {
      statusEl.removeClass("llm-hub-mcp-status--success");
      statusEl.addClass("llm-hub-mcp-status--error");
      statusEl.setText(t("settings.mcpSaveFailed", { error: formatError(error) }));
    } finally {
      unlock();
    }
  }

  private async testConnection(statusEl: HTMLElement, btnEl: HTMLButtonElement): Promise<void> {
    if (this.busy) return;
    const unlock = this.lockControls();
    this.invalidateConnectionTest();
    statusEl.empty();
    statusEl.removeClass("llm-hub-mcp-status--success", "llm-hub-mcp-status--error");
    statusEl.setText(t("settings.mcpChecking"));
    btnEl.textContent = t("settings.mcpChecking");
    btnEl.disabled = true;
    let client: ReturnType<typeof createMcpClient> | null = null;

    try {
      let testConfig: McpServerConfig;

      if (this.server.transport === "stdio") {
        if (!this.server.command?.trim()) {
          statusEl.addClass("llm-hub-mcp-status--error");
          statusEl.setText(t("settings.mcpServerCommandRequired"));
          btnEl.disabled = false;
          return;
        }

        // Parse env for test
        let env: Record<string, string> | undefined;
        if (this.envText.trim()) {
          try {
            env = parseStringRecord(this.envText);
          } catch {
            statusEl.addClass("llm-hub-mcp-status--error");
            statusEl.setText(t("settings.mcpServerInvalidEnv"));
            btnEl.disabled = false;
            return;
          }
        }

        testConfig = {
          name: this.server.name || "test",
          transport: "stdio",
          url: "",
          ...normalizeSpawnCommand(this.server.command, splitCommandLine(this.argsText)),
          env,
          framing: this.server.framing || "newline",
          enabled: true,
        };
      } else {
        // Parse headers for test
        let headers: Record<string, string> | undefined;
        if (this.headersText.trim()) {
          try {
            headers = parseStringRecord(this.headersText);
          } catch {
            statusEl.addClass("llm-hub-mcp-status--error");
            statusEl.setText(t("settings.mcpServerInvalidHeaders"));
            btnEl.disabled = false;
            return;
          }
        }

        testConfig = {
          name: this.server.name || "test",
          transport: "http",
          url: this.server.url,
          headers,
          enabled: true,
        };
      }

      client = createMcpClient(testConfig);
      this.testClient = client;

      await client.initialize();
      const tools = await client.listTools();

      // Save tool hints
      const toolNames = tools.map(tool => tool.name);
      this.server.toolHints = toolNames;

      // Mark connection as tested and enable save button
      this.connectionTested = true;

      if (this.testRequiredEl) {
        this.testRequiredEl.addClass("llm-hub-hidden");
      }

      statusEl.addClass("llm-hub-mcp-status--success");
      statusEl.empty();

      // Show tool count
      const countEl = statusEl.createDiv({ cls: "llm-hub-mcp-tools-count" });
      countEl.setText(t("settings.mcpConnectionSuccess", { count: String(tools.length) }));

      // Show tool names if any
      if (tools.length > 0) {
        const toolsEl = statusEl.createDiv({ cls: "llm-hub-mcp-tools-list" });
        toolsEl.setText(toolNames.join(", "));
      }
    } catch (error) {
      // Reset connection tested flag on error
      this.connectionTested = false;
      this.server.toolHints = undefined;
      if (this.saveBtn) {
        this.saveBtn.setDisabled(true);
      }
      if (this.testRequiredEl) {
        this.testRequiredEl.removeClass("llm-hub-hidden");
      }

      statusEl.addClass("llm-hub-mcp-status--error");
      statusEl.setText(t("settings.mcpConnectionFailed", { error: formatError(error) }));
    } finally {
      await client?.close().catch(() => {});
      this.testClient = null;
      btnEl.textContent = t("settings.testMcpConnection");
      unlock();
    }
  }

  onClose() {
    void this.testClient?.close().catch(() => {});
    this.contentEl.empty();
  }
}
