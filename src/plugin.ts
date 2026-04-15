import { Plugin, WorkspaceLeaf, Notice, MarkdownView, TFile, Modal } from "obsidian";
import { EventEmitter } from "src/utils/EventEmitter";
import type { SelectionLocationInfo } from "src/ui/selectionHighlight";
import { SelectionManager } from "src/plugin/selectionManager";
import { EncryptionManager } from "src/plugin/encryptionManager";
import { WorkflowManager } from "src/plugin/workflowManager";
import { WorkspaceStateManager } from "src/core/workspaceStateManager";
import { ChatView, VIEW_TYPE_GEMINI_CHAT } from "src/ui/ChatView";
import { CryptView, CRYPT_VIEW_TYPE } from "src/ui/CryptView";
import { SettingsTab } from "src/ui/SettingsTab";
import {
  type LlmHubSettings,
  type WorkspaceState,
  type RagSetting,
  type ModelType,
  type SlashCommand,
  DEFAULT_SETTINGS,
  DEFAULT_LOCAL_LLM_CONFIG,
  getGeminiApiKey,
} from "src/types";
import { initGeminiClient, resetGeminiClient, getGeminiClient } from "src/core/gemini";
import { initLangfuse, resetLangfuse } from "src/tracing/langfuse";
import { WorkflowSelectorModal } from "src/ui/components/workflow/WorkflowSelectorModal";
import {
  initLocalRagStore,
  resetLocalRagStore,
  getLocalRagStore,
} from "src/core/localRagStore";
import { initCliProviderManager } from "src/core/cliProvider";
import {
  initEditHistoryManager,
  resetEditHistoryManager,
  getEditHistoryManager,
} from "src/core/editHistory";
import { EditHistoryModal } from "src/ui/components/EditHistoryModal";
import { formatError } from "src/utils/error";
import { DEFAULT_CLI_CONFIG, DEFAULT_DISCORD_SETTINGS, DEFAULT_EDIT_HISTORY_SETTINGS, DEFAULT_GEMINI_EMBEDDING_MODEL, DEFAULT_LANGFUSE_SETTINGS, DEFAULT_WORKSPACE_FOLDER, hasVerifiedCli } from "src/types";
import { initLocale, t } from "src/i18n";
import { registerWorkflowCodeBlockProcessor } from "src/ui/workflowCodeBlock";
import { initDiscordService, resetDiscordService } from "src/core/discordService";


export class LlmHubPlugin extends Plugin {
  settings: LlmHubSettings = { ...DEFAULT_SETTINGS };
  settingsEmitter = new EventEmitter();
  private wsManager!: WorkspaceStateManager;
  private selectionManager!: SelectionManager;
  private encryptionManager!: EncryptionManager;
  private lastActiveMarkdownView: MarkdownView | null = null;
  private workflowMgr!: WorkflowManager;
  /** In-memory only – cleared on Obsidian restart */
  lastActiveChatId: string | null = null;

  // Delegate workspaceState to the manager
  get workspaceState(): WorkspaceState {
    return this.wsManager.workspaceState;
  }
  set workspaceState(value: WorkspaceState) {
    this.wsManager.workspaceState = value;
  }

  onload(): void {
    // Initialize i18n locale
    initLocale();

    // Initialize selection manager
    this.selectionManager = new SelectionManager(this);

    // Initialize encryption manager
    this.encryptionManager = new EncryptionManager(this);

    // Initialize workflow manager
    this.workflowMgr = new WorkflowManager(this);

    // Workflow code block: render as Mermaid diagram (Reading mode + Live Preview)
    registerWorkflowCodeBlockProcessor(this);

    // Initialize workspace state manager
    this.wsManager = new WorkspaceStateManager(
      this.app,
      () => this.settings,
      () => this.saveSettings(),
      this.settingsEmitter,
      () => this.loadData()
    );

    // Handle migration data modified event
    this.settingsEmitter.on("migration-data-modified", (data: unknown) => {
      void (async () => {
        await this.saveData(data);
      })();
    });

    // Load settings and workspace state
    void this.loadSettings().then(async () => {
      // Apply workspace folder visibility (body class toggle)
      this.updateWorkspaceFolderVisibility();

      // Migrate from old settings format first (one-time)
      try {
        await this.wsManager.migrateFromOldSettings();
      } catch (e) {
        console.error("LLM Hub: Failed to migrate old settings:", formatError(e));
      }
      try {
        await this.wsManager.loadWorkspaceState();
      } catch (e) {
        console.error("LLM Hub: Failed to load workspace state:", formatError(e));
      }
      // Migrate slash commands (add default commands if missing)
      try {
        await this.migrateSlashCommands();
      } catch (e) {
        console.error("LLM Hub: Failed to migrate slash commands:", formatError(e));
      }
      // Initialize clients if any CLI is verified or any API provider is configured
      try {
        const cliConfig = this.settings.cliConfig || DEFAULT_CLI_CONFIG;
        if (hasVerifiedCli(cliConfig) || this.settings.localLlmVerified || this.settings.apiProviders?.some(p => p.enabled && p.verified)) {
          this.initializeClients();
        }
      } catch (e) {
        console.error("LLM Hub: Failed to initialize clients:", formatError(e));
      }
      // Register workflows as Obsidian commands for hotkey support
      try {
        this.registerWorkflowHotkeys();
      } catch (e) {
        console.error("LLM Hub: Failed to register workflow hotkeys:", formatError(e));
      }
      // Register event listeners for workflow triggers
      try {
        this.registerWorkflowEventListeners();
      } catch (e) {
        console.error("LLM Hub: Failed to register workflow event listeners:", formatError(e));
      }
      // Emit event to refresh UI after workspace state is loaded
      this.settingsEmitter.emit("workspace-state-loaded", this.workspaceState);
      // Notify UI components that settings are ready (fixes race condition where
      // ChatView renders before loadSettings() completes, e.g. after BRAT hot-reload)
      this.settingsEmitter.emit("settings-updated", this.settings);
    }).catch((e) => {
      console.error("LLM Hub: Failed to load settings:", formatError(e));
    });

    // Add settings tab
    this.addSettingTab(new SettingsTab(this.app, this));

    // Register chat view
    this.registerView(
      VIEW_TYPE_GEMINI_CHAT,
      (leaf) => new ChatView(leaf, this)
    );

    // Register crypt view (for encrypted files)
    this.registerView(
      CRYPT_VIEW_TYPE,
      (leaf) => new CryptView(leaf, this)
    );

    // Register .encrypted extension so Obsidian opens these files in CryptView
    // Wrapped in try-catch to avoid conflict when another plugin already registered this extension
    try {
      this.registerExtensions(["encrypted"], CRYPT_VIEW_TYPE);
    } catch {
      // Extension already registered by another plugin — skip
    }

    // Register file menu (right-click) for encryption and edit history
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof TFile && file.extension === "md") {
          menu.addItem((item) => {
            item
              .setTitle(t("crypt.encryptFile"))
              .setIcon("lock")
              .onClick(async () => {
                await this.encryptFile(file);
              });
          });
          menu.addItem((item) => {
            item
              .setTitle(t("statusBar.snapshot"))
              .setIcon("camera")
              .onClick(async () => {
                await this.saveSnapshotForFile(file);
              });
          });
          menu.addItem((item) => {
            item
              .setTitle(t("statusBar.history"))
              .setIcon("history")
              .onClick(() => {
                new EditHistoryModal(this.app, file.path).open();
              });
          });
        }
      })
    );

    // Ensure chat view exists on layout ready
    this.app.workspace.onLayoutReady(() => {
      void this.ensureChatViewExists();
    });

    // Track active markdown view and capture selection when switching to chat
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf?.view?.getViewType() === VIEW_TYPE_GEMINI_CHAT) {
          // Capture selection from the last active markdown view
          this.captureSelectionFromView(this.lastActiveMarkdownView);
          // Notify Chat component that it's now active
          this.settingsEmitter.emit("chat-activated");
        } else {
          // Leaving chat view - clear the highlight
          this.clearSelectionHighlight();
          if (leaf?.view instanceof MarkdownView) {
            // Track the last active markdown view
            this.lastActiveMarkdownView = leaf.view;
          }
        }
      })
    );

    // Add ribbon icon
    this.addRibbonIcon("brain-circuit", "Open chat", () => {
      void this.activateChatView();
    });

    // Add command to open chat
    this.addCommand({
      id: "open-chat",
      name: "Open chat",
      callback: () => {
        void this.activateChatView();
      },
    });

    // Add command to toggle between chat and markdown view
    this.addCommand({
      id: "toggle-chat",
      name: "Toggle chat / editor",
      callback: () => {
        this.toggleChatView();
      },
    });

    // Add command to show edit history
    this.addCommand({
      id: "show-edit-history",
      name: t("command.showEditHistory"),
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          if (!checking) {
            new EditHistoryModal(this.app, activeFile.path).open();
          }
          return true;
        }
        return false;
      },
    });

    // Add command to restore previous version
    this.addCommand({
      id: "restore-previous-version",
      name: t("command.restorePreviousVersion"),
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          if (!checking) {
            void this.restorePreviousVersion(activeFile.path);
          }
          return true;
        }
        return false;
      },
    });

    // Add command to encrypt current file
    this.addCommand({
      id: "encrypt-file",
      name: t("command.encryptFile"),
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === "md") {
          if (!checking) {
            void this.encryptFile(activeFile);
          }
          return true;
        }
        return false;
      },
    });

    // Add command to decrypt current file
    this.addCommand({
      id: "decrypt-file",
      name: t("command.decryptFile"),
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && (activeFile.extension === "md" || activeFile.extension === "encrypted")) {
          if (!checking) {
            void this.decryptCurrentFile(activeFile);
          }
          return true;
        }
        return false;
      },
    });

    // Add command to run workflow
    this.addCommand({
      id: "run-workflow",
      name: t("command.runWorkflow"),
      callback: () => {
        new WorkflowSelectorModal(this.app, this, (filePath) => {
          void this.executeWorkflowFromHotkey(filePath);
        }).open();
      },
    });

    // Register file events for edit history
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile && file.extension === "md") {
          const historyManager = getEditHistoryManager();
          if (historyManager) {
            historyManager.handleFileRename(oldPath, file.path);
          }
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          const historyManager = getEditHistoryManager();
          if (historyManager) {
            historyManager.handleFileDelete(file.path);
          }
        }
      })
    );

    // Initialize snapshot when a file is opened (for edit history)
    // Also check if .md file is encrypted and redirect to CryptView
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file instanceof TFile) {
          if (file.extension === "md") {
            const historyManager = getEditHistoryManager();
            if (historyManager) {
              void historyManager.initSnapshot(file.path);
            }

            // Check if file is encrypted and redirect to CryptView
            void this.checkAndOpenEncryptedFile(file);
          }
        }
      })
    );

  }

  /**
   * Save a snapshot for a specific file
   */
  private async saveSnapshotForFile(file: TFile): Promise<void> {
    const historyManager = getEditHistoryManager();
    if (!historyManager) {
      new Notice(t("editHistory.notInitialized"));
      return;
    }

    await historyManager.ensureSnapshot(file.path);
    const entry = historyManager.saveEdit({
      path: file.path,
      modifiedContent: await this.app.vault.read(file),
      source: "manual",
    });

    if (entry) {
      new Notice(t("statusBar.snapshotSaved"));
    } else {
      new Notice(t("editHistory.noChanges"));
    }
  }

  /**
   * Save a snapshot for the active file
   */
  private async saveSnapshotForActiveFile(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice(t("editHistory.noActiveFile"));
      return;
    }
    await this.saveSnapshotForFile(activeFile);
  }

  private async restorePreviousVersion(filePath: string): Promise<void> {
    const historyManager = getEditHistoryManager();
    if (!historyManager) {
      new Notice("Edit history manager not initialized");
      return;
    }

    const history = historyManager.getHistory(filePath);
    if (history.length === 0) {
      new Notice(t("editHistoryModal.noHistory"));
      return;
    }

    // Get the most recent entry and restore to before that change
    const lastEntry = history[history.length - 1];

    // Show confirmation modal
    const confirmed = await new Promise<boolean>((resolve) => {
      const modal = new Modal(this.app);
      modal.contentEl.createEl("p", { text: t("editHistoryModal.confirmRestore") });
      const buttonContainer = modal.contentEl.createDiv({ cls: "modal-button-container" });
      buttonContainer.createEl("button", { text: t("common.cancel") }).addEventListener("click", () => {
        modal.close();
        resolve(false);
      });
      buttonContainer.createEl("button", { text: t("common.confirm"), cls: "mod-warning" }).addEventListener("click", () => {
        modal.close();
        resolve(true);
      });
      modal.open();
    });

    if (confirmed) {
      await historyManager.restoreTo(filePath, lastEntry.id);
      const date = new Date(lastEntry.timestamp);
      const timeStr = date.toLocaleString();
      new Notice(t("editHistoryModal.restored", { timestamp: timeStr }));
    }
  }

  onunload(): void {
    this.clearSelectionHighlight();
    resetLangfuse();
    resetGeminiClient();
    resetLocalRagStore();
    resetEditHistoryManager();
    resetDiscordService();

    // Restore workspace folder visibility on unload
    this.settings.hideWorkspaceFolder = false;
    this.updateWorkspaceFolderVisibility();

    // Clean up workflow timers
    this.workflowMgr.cleanup();

  }

  async loadSettings() {
    const loaded = await this.loadData() ?? {};

    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      // Deep copy arrays to avoid mutating DEFAULT_SETTINGS
      // Use loaded commands if present, otherwise use default commands
      slashCommands: loaded.slashCommands
        ? [...loaded.slashCommands]
        : [...DEFAULT_SETTINGS.slashCommands],
      // Deep copy API providers (ensure enabledModels exists)
      apiProviders: loaded.apiProviders
        ? (loaded.apiProviders as Record<string, unknown>[]).map(p => ({
            ...p,
            enabledModels: (p.enabledModels as string[] | undefined) ?? [],
          }))
        : [],
      // Deep copy MCP servers (add default transport for backward compatibility)
      mcpServers: loaded.mcpServers
        ? (loaded.mcpServers as Record<string, unknown>[]).map(s => ({
            ...s,
            transport: (s.transport as string) || "http",
          }))
        : [],
      // Deep copy workflow arrays
      enabledWorkflowHotkeys: loaded.enabledWorkflowHotkeys
        ? [...loaded.enabledWorkflowHotkeys]
        : [],
      enabledWorkflowEventTriggers: loaded.enabledWorkflowEventTriggers
        ? [...loaded.enabledWorkflowEventTriggers]
        : [],
      // Deep merge editHistory settings
      editHistory: {
        ...DEFAULT_EDIT_HISTORY_SETTINGS,
        ...(loaded.editHistory ?? {}),
        diff: {
          ...DEFAULT_EDIT_HISTORY_SETTINGS.diff,
          ...(loaded.editHistory?.diff ?? {}),
        },
      },
      // Deep merge langfuse settings
      langfuse: {
        ...DEFAULT_LANGFUSE_SETTINGS,
        ...(loaded.langfuse ?? {}),
      },
      // Deep merge local LLM settings
      localLlmConfig: {
        ...DEFAULT_LOCAL_LLM_CONFIG,
        ...(loaded.localLlmConfig ?? {}),
      },
      // Deep merge Discord settings
      discord: {
        ...DEFAULT_DISCORD_SETTINGS,
        ...(loaded.discord ?? {}),
      },
    };
  }

  async saveSettings() {
    // Only save values that differ from defaults
    const dataToSave: Partial<LlmHubSettings> = {};
    for (const key of Object.keys(this.settings) as (keyof LlmHubSettings)[]) {
      const currentValue = this.settings[key];
      const defaultValue = DEFAULT_SETTINGS[key];
      // Use JSON.stringify for arrays/objects comparison
      const isDifferent = Array.isArray(currentValue) || (typeof currentValue === 'object' && currentValue !== null)
        ? JSON.stringify(currentValue) !== JSON.stringify(defaultValue)
        : currentValue !== defaultValue;
      if (isDifferent) {
        (dataToSave as Record<string, unknown>)[key] = currentValue;
      }
    }
    // Always persist workspaceFolder to survive migrations and plugin updates
    (dataToSave as Record<string, unknown>).workspaceFolder = this.settings.workspaceFolder;
    await this.saveData(dataToSave);
    this.settingsEmitter.emit("settings-updated", this.settings);

    // Always reinitialize clients to pick up any config changes
    this.initializeClients();

    // Re-register workflow hotkeys
    this.registerWorkflowHotkeys();
  }

  registerWorkflowHotkeys(): void {
    this.workflowMgr.registerHotkeys();
  }

  async executeWorkflowFromHotkey(filePath: string): Promise<void> {
    return this.workflowMgr.executeFromHotkey(filePath);
  }

  registerWorkflowEventListeners(): void {
    this.workflowMgr.registerEventListeners();
  }

  // ========================================
  // Workspace State Methods (delegated to WorkspaceStateManager)
  // ========================================

  getWorkspaceStateFilePath(): string {
    return this.wsManager.getWorkspaceStateFilePath();
  }

  async loadWorkspaceState(): Promise<void> {
    await this.wsManager.loadWorkspaceState();
    this.settingsEmitter.emit("workspace-state-loaded", this.workspaceState);
  }

  async loadOrCreateWorkspaceState(): Promise<void> {
    return this.wsManager.loadOrCreateWorkspaceState();
  }

  async saveWorkspaceState(): Promise<void> {
    return this.wsManager.saveWorkspaceState();
  }

  /** Show or hide the workspace folder in the file explorer. */
  updateWorkspaceFolderVisibility(): void {
    const wsFolder = this.settings.workspaceFolder || DEFAULT_WORKSPACE_FOLDER;
    const hide = this.settings.hideWorkspaceFolder;
    // Find and toggle visibility on the exact matching nav-folder element
    document.querySelectorAll(`.nav-folder[data-path="${CSS.escape(wsFolder)}"]`).forEach((el) => {
      (el as HTMLElement).style.display = hide ? "none" : "";
    });
  }

  getSelectedRagSetting(): RagSetting | null {
    return this.wsManager.getSelectedRagSetting();
  }

  getRagSetting(name: string): RagSetting | null {
    return this.wsManager.getRagSetting(name);
  }

  getRagSettingNames(): string[] {
    return this.wsManager.getRagSettingNames();
  }

  async selectRagSetting(name: string | null): Promise<void> {
    return this.wsManager.selectRagSetting(name);
  }

  async selectModel(model: ModelType): Promise<void> {
    return this.wsManager.selectModel(model);
  }

  getSelectedModel(): ModelType {
    return this.wsManager.getSelectedModel();
  }

  async createRagSetting(name: string, setting?: Partial<RagSetting>): Promise<void> {
    return this.wsManager.createRagSetting(name, setting);
  }

  async updateRagSetting(name: string, updates: Partial<RagSetting>): Promise<void> {
    return this.wsManager.updateRagSetting(name, updates);
  }

  async deleteRagSetting(name: string): Promise<void> {
    return this.wsManager.deleteRagSetting(name);
  }

  async renameRagSetting(oldName: string, newName: string): Promise<void> {
    return this.wsManager.renameRagSetting(oldName, newName);
  }

  async resetRagSettingSyncState(name: string): Promise<void> {
    return this.wsManager.resetRagSettingSyncState(name);
  }

  getVaultStoreName(): string {
    return this.wsManager.getVaultStoreName();
  }

  // Migrate from old settings format (plugin-specific parts)
  private async migrateSlashCommands(): Promise<void> {
    // Add default infographic command if not present
    const hasInfographicCommand = this.settings.slashCommands.some(
      (cmd) => cmd.name === "infographic"
    );
    if (!hasInfographicCommand) {
      this.settings.slashCommands.push({
        id: "cmd_infographic_default",
        name: "infographic",
        promptTemplate: "Convert the following content into an HTML infographic. Output the HTML directly in your response, do not create a note:\n\n{selection}",
        model: null,
        description: "Generate HTML infographic from selection or active note",
        searchSetting: null,
      });
      await this.saveSettings();
    }
  }

  private initializeClients() {
    // Only initialize Gemini API client when a Gemini provider is configured
    const geminiApiKey = getGeminiApiKey(this.settings);
    if (geminiApiKey) {
      // Use first available model from Gemini provider, or a reasonable default
      const geminiProvider = this.settings.apiProviders.find(p => p.type === "gemini" && p.enabled);
      const defaultModel = geminiProvider?.enabledModels[0] || "gemini-3-flash-preview";
      initGeminiClient(geminiApiKey, defaultModel as ModelType, this.settings.proxyUrl, this.settings.proxyBypass);
    }
    initLangfuse(this.settings.langfuse);

    // Initialize CLI provider manager
    initCliProviderManager();

    // Initialize edit history manager
    const editHistorySettings = this.settings.editHistory || DEFAULT_EDIT_HISTORY_SETTINGS;
    initEditHistoryManager(this.app, editHistorySettings);

    // Initialize local RAG store and preload existing index
    const localRag = initLocalRagStore();
    localRag.workspaceFolder = this.settings.workspaceFolder || DEFAULT_WORKSPACE_FOLDER;
    void localRag.load(
      this.app,
      Object.keys(this.workspaceState.ragSettings),
      this.workspaceState.ragSettings
    );

    // Start Discord bot if enabled
    const discordConfig = this.settings.discord;
    if (discordConfig?.enabled && discordConfig.botToken) {
      try {
        const discordService = initDiscordService(this.app, this);
        discordService.start();
      } catch (e) {
        console.error("LLM Hub: Failed to start Discord bot:", formatError(e));
      }
    }

  }

  private async ensureChatViewExists() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GEMINI_CHAT);
    if (leaves.length === 0) {
      let leaf = this.app.workspace.getRightLeaf(false);
      if (!leaf) {
        leaf = this.app.workspace.getRightLeaf(true);
      }
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_GEMINI_CHAT,
          active: false,
        });
      }
    }
  }

  async activateChatView(): Promise<void> {
    // Capture selection before switching focus
    this.captureSelection();

    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;

    const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_GEMINI_CHAT);
    if (existingLeaves.length > 0) {
      leaf = existingLeaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_GEMINI_CHAT,
          active: true,
        });
      }
    }

    if (leaf) {
      void workspace.revealLeaf(leaf);
    }
  }

  // Toggle between chat view and last active markdown view
  private toggleChatView(): void {
    const chatLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GEMINI_CHAT);
    const activeChatView = this.app.workspace.getActiveViewOfType(ChatView);

    if (activeChatView) {
      // Currently in chat, go back to last markdown view
      if (this.lastActiveMarkdownView?.leaf) {
        this.clearSelectionHighlight();
        this.app.workspace.setActiveLeaf(this.lastActiveMarkdownView.leaf, { focus: true });
      }
    } else {
      // Not in chat, capture selection and open/activate chat
      this.captureSelectionFromView(this.lastActiveMarkdownView);
      if (chatLeaves.length > 0) {
        this.app.workspace.setActiveLeaf(chatLeaves[0], { focus: true });
        // Notify Chat component that it's now active
        this.settingsEmitter.emit("chat-activated");
      } else {
        void this.activateChatView();
      }
    }
  }

  // Capture selection from a specific markdown view
  private captureSelectionFromView(view: MarkdownView | null): void {
    this.selectionManager.captureSelectionFromView(view);
  }

  captureSelection(): void {
    this.selectionManager.captureSelection();
  }

  clearSelectionHighlight(): void {
    this.selectionManager.clearSelectionHighlight();
  }

  getLastSelection(): string {
    return this.selectionManager.getLastSelection();
  }

  getSelectionLocation(): SelectionLocationInfo | null {
    return this.selectionManager.getSelectionLocation();
  }

  clearLastSelection(): void {
    this.selectionManager.clearLastSelection();
  }

  // Sync vault for local RAG (embedding-based)
  async syncVaultForLocalRAG(
    ragSettingName: string,
    onProgress?: (current: number, total: number, fileName: string, action: "embed" | "skip" | "remove") => void
  ): Promise<{ embedded: number; skipped: number; removed: number; errors: string[] } | null> {
    const localRag = getLocalRagStore();
    if (!localRag) {
      new Notice(t("chat.clientNotInitialized"));
      return null;
    }

    const ragSetting = this.workspaceState.ragSettings[ragSettingName];
    if (!ragSetting) {
      new Notice(`Semantic search setting "${ragSettingName}" not found.`);
      return null;
    }

    if (ragSetting.externalIndexPath) {
      new Notice(t("settings.externalIndexSyncDisabled"));
      return null;
    }

    const embeddingApiKey = ragSetting.embeddingApiKey || getGeminiApiKey(this.settings);
    if (!embeddingApiKey) {
      new Notice("API key is required for embedding (set Google API key or custom embedding API key)");
      return null;
    }

    try {
      const effectiveModel = ragSetting.embeddingModel || (ragSetting.embeddingBaseUrl ? "" : DEFAULT_GEMINI_EMBEDDING_MODEL);
      // Auto-enable multimodal indexing:
      // - Gemini native embedding models: full multimodal (PDF binary, images, audio, video)
      // - Non-Gemini (custom base URL): PDF only via text extraction
      const indexMultimodal = !ragSetting.embeddingBaseUrl
        ? /gemini-embedding-/i.test(effectiveModel)
        : true;
      const result = await localRag.sync(
        this.app,
        ragSettingName,
        embeddingApiKey,
        effectiveModel,
        ragSetting.chunkSize,
        ragSetting.chunkOverlap,
        ragSetting.pdfChunkPages ?? 6,
        {
          includeFolders: ragSetting.targetFolders,
          excludePatterns: ragSetting.excludePatterns,
        },
        onProgress,
        ragSetting.embeddingBaseUrl || undefined,
        indexMultimodal,
        this.settings.proxyUrl,
        this.settings.proxyBypass,
      );

      // Update sync metadata
      this.workspaceState.ragSettings[ragSettingName] = {
        ...ragSetting,
        lastFullSync: result.errors.length === 0 ? Date.now() : ragSetting.lastFullSync,
      };
      await this.saveWorkspaceState();
      this.settingsEmitter.emit("workspace-state-loaded", this.workspaceState);

      return result;
    } catch (error) {
      throw (error instanceof Error ? error : new Error(formatError(error)));
    }
  }

  // Clear local RAG index
  async clearLocalRagIndex(ragSettingName: string): Promise<void> {
    const ragSetting = this.workspaceState.ragSettings[ragSettingName];
    if (ragSetting?.externalIndexPath) {
      new Notice(t("settings.externalIndexSyncDisabled"));
      return;
    }

    const localRag = getLocalRagStore();
    if (localRag) {
      await localRag.clear(this.app, ragSettingName);
    }

    if (ragSetting) {
      this.workspaceState.ragSettings[ragSettingName] = {
        ...ragSetting,
        lastFullSync: null,
      };
      await this.saveWorkspaceState();
      this.settingsEmitter.emit("workspace-state-loaded", this.workspaceState);
    }
  }

  // Get slash commands for workflow
  getSlashCommands(): SlashCommand[] {
    return this.settings.slashCommands;
  }

  // Execute a slash command for workflow
  async executeSlashCommand(
    commandIdOrName: string,
    options?: {
      value?: string;
      contentPath?: string;
      selection?: { path: string; start: unknown; end: unknown };
      chatId?: string;
    }
  ): Promise<{ response: string; chatId: string }> {
    // Find the command
    const command = this.settings.slashCommands.find(
      (cmd) => cmd.id === commandIdOrName || cmd.name === commandIdOrName
    );

    if (!command) {
      throw new Error(`Slash command not found: ${commandIdOrName}`);
    }

    // Get the content to use
    let content = "";
    if (options?.value) {
      content = options.value;
    } else if (options?.contentPath) {
      // Read content from file
      const file = this.app.vault.getAbstractFileByPath(options.contentPath);
      if (file instanceof TFile) {
        content = await this.app.vault.read(file);
      }
    } else if (options?.selection) {
      // Read content from selection
      const selectionPath = options.selection.path;
      const file = this.app.vault.getAbstractFileByPath(selectionPath);
      if (file instanceof TFile) {
        const fileContent = await this.app.vault.read(file);
        // For now, just use the whole file content
        // TODO: Extract selection range
        content = fileContent;
      }
    }

    // Replace {selection} placeholder in template
    const prompt = command.promptTemplate.replace(/\{selection\}/g, content);

    // Get the Gemini client
    const client = getGeminiClient();
    if (!client) {
      throw new Error("Gemini client not initialized");
    }

    // Set model if specified
    if (command.model) {
      client.setModel(command.model);
    }

    // Send message
    const response = await client.chat(
      [{ role: "user", content: prompt, timestamp: Date.now() }],
      this.settings.systemPrompt || undefined
    );

    // Generate or use existing chatId
    const chatId = options?.chatId || `workflow-${Date.now()}`;

    return { response, chatId };
  }

  // ========================================
  // Encryption Methods
  // ========================================

  /**
   * Encrypt a file
   */
  async encryptFile(file: TFile): Promise<void> {
    return this.encryptionManager.encryptFile(file);
  }

  private async checkAndOpenEncryptedFile(file: TFile): Promise<void> {
    return this.encryptionManager.checkAndOpenEncryptedFile(file);
  }

  async decryptCurrentFile(file: TFile): Promise<void> {
    return this.encryptionManager.decryptCurrentFile(file);
  }
}
