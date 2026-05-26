import type { Content } from "@google/genai";

// MCP transport types
export type McpTransport = "http" | "stdio";
export type McpFraming = "content-length" | "newline";

// MCP (Model Context Protocol) server configuration
export interface McpServerConfig {
  name: string;           // Server display name
  transport: McpTransport; // "http" (Streamable HTTP) or "stdio" (local process)
  // HTTP transport fields
  url: string;            // Streamable HTTP endpoint URL (used for HTTP transport)
  headers?: Record<string, string>;  // Optional headers for authentication (HTTP only)
  // Stdio transport fields (desktop only)
  command?: string;        // Executable command (e.g., "npx", "uvx", "/path/to/server")
  args?: string[];         // Command arguments (e.g., ["-y", "@mcp/server"])
  env?: Record<string, string>;  // Environment variables for the child process
  framing?: McpFraming;    // Framing protocol: "content-length" (default) or "newline"
  // Common
  enabled: boolean;       // Whether this server is enabled for chat
  toolHints?: string[];   // Tool names from test connection (for display hints)
}

// MCP tool information (from server)
export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  _meta?: {
    ui?: {
      resourceUri: string;  // ui:// URI for MCP Apps
    };
  };
}

// MCP Apps types
export interface McpAppContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: {
    uri: string;
    mimeType?: string;
    text?: string;
  };
}

export interface McpAppResult {
  content: McpAppContent[];
  isError?: boolean;
  _meta?: {
    ui?: {
      resourceUri: string;
    };
  };
}

// MCP App UI resource (HTML/JS content from ui:// scheme)
export interface McpAppUiResource {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;  // Base64 encoded binary data
}

// Obsidian event types for workflow triggers
export type ObsidianEventType =
  | "create"    // vault.on("create") - New file created
  | "modify"    // vault.on("modify") - File modified/saved
  | "delete"    // vault.on("delete") - File deleted
  | "rename"    // vault.on("rename") - File renamed
  | "file-open"; // workspace.on("file-open") - File opened

// Event trigger configuration for workflows
export interface WorkflowEventTrigger {
  workflowId: string;        // Vault path to the workflow file (e.g., "folder/file.md"). Each file holds exactly one workflow.
  events: ObsidianEventType[]; // Which events trigger this workflow
  filePattern?: string;       // Optional glob pattern to filter files (e.g., "*.md", "folder/**")
}

// Vault tool mode type
export type VaultToolMode = "all" | "noSearch" | "none";

// Reason why vault tools are set to "none"
// "manual" = user manually turned off (MCP servers remain unchanged)
// "cli" = CLI mode (MCP servers also disabled)
export type VaultToolNoneReason = "manual" | "cli";

// Slash command definition
export interface SlashCommand {
  id: string;
  name: string;                 // コマンド名 (例: "translate")
  promptTemplate: string;       // テンプレート (例: "{selection}を英語に翻訳して")
  model?: ModelType | null;     // null = 現在のモデルを使用
  description?: string;         // オートコンプリートに表示
  searchSetting?: string | null; // null = 現在の設定, "" = None, "__websearch__" = Web Search, その他 = Semantic Search設定名
  confirmEdits?: boolean;       // undefined/true = 編集確認を表示, false = 自動適用
  vaultToolMode?: VaultToolMode | null; // null = 現在の設定, "all" = すべて, "noSearch" = 検索なし, "none" = オフ
  enabledMcpServers?: string[] | null;  // null = 現在の設定, [] = すべてオフ, ["name1", "name2"] = 指定のサーバーのみ有効
}

// Settings interface
export interface LlmHubSettings {

  // CLI provider settings
  cliConfig: CliProviderConfig;

  // Local LLM settings (one or more configurations)
  localLlmConfigs: LocalLlmConfig[];
  // Legacy fields — populated only for backward-compat during migration. They
  // are converted to `localLlmConfigs[0]` at load time and then dropped.
  localLlmConfig?: LocalLlmConfig;
  localLlmVerified?: boolean;
  localLlmAvailableModels?: string[];

  // Workspace settings
  workspaceFolder: string;
  hideWorkspaceFolder: boolean;
  saveChatHistory: boolean;
  systemPrompt: string;

  // Slash commands
  slashCommands: SlashCommand[];

  // Workflow hotkeys
  enabledWorkflowHotkeys: string[];  // Vault paths to workflow files (e.g., "folder/file.md"). Each file holds exactly one workflow.

  // Workflow event triggers
  enabledWorkflowEventTriggers: WorkflowEventTrigger[];  // Event-triggered workflows

  // API providers (OpenAI-compatible)
  apiProviders: ApiProviderConfig[];

  // MCP servers
  mcpServers: McpServerConfig[];  // External MCP server configurations

  // Function call limits (for settings UI)
  maxFunctionCalls: number;           // 最大function call回数
  functionCallWarningThreshold: number; // 残りこの回数で警告
  listNotesLimit: number;             // listNotesのデフォルト件数制限
  maxNoteChars: number;               // ノート読み込み時の最大文字数

  // Privacy ACL
  privacy: PrivacySettings;

  // Edit history settings
  editHistory: EditHistorySettings;

  // Encryption settings
  encryption: EncryptionSettings;

  // Langfuse observability
  langfuse: LangfuseSettings;

  // Last used model for AI workflow generation
  lastAIWorkflowModel?: string;

  // Last selected workflow path in Run Workflow modal
  lastSelectedWorkflowPath?: string;

  // Discord integration
  discord: DiscordSettings;

  // Proxy settings for corporate gateways
  proxyUrl?: string;              // HTTP(S) proxy URL (e.g. http://proxy:8080)
  proxyBypass?: string;           // Comma-separated hosts to bypass proxy (e.g. api.openai.com,localhost)
}

// Privacy ACL settings — restrict cloud providers from accessing private notes
export interface PrivacySettings {
  enabled: boolean;
  privateTag: string;
  privateFolders: string[];
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  enabled: false,
  privateTag: "private",
  privateFolders: [],
};

// Edit history settings
export interface EditHistorySettings {
  enabled: boolean;
  diff: {
    contextLines: number;
  };
}

// Langfuse observability settings
// Tracing is active when both publicKey and secretKey are set.
export interface LangfuseSettings {
  publicKey: string;      // Langfuse public key
  secretKey: string;      // Langfuse secret key
  baseUrl: string;        // Default: "https://cloud.langfuse.com"
  logPrompts: boolean;    // Default: false (privacy)
  logResponses: boolean;  // Default: false (privacy)
}

export const DEFAULT_LANGFUSE_SETTINGS: LangfuseSettings = {
  publicKey: "",
  secretKey: "",
  baseUrl: "https://cloud.langfuse.com",
  logPrompts: false,
  logResponses: false,
};

// Discord integration settings
export interface DiscordSettings {
  enabled: boolean;          // Whether the Discord bot is active
  botToken: string;          // Discord bot token
  allowedChannelIds: string; // Comma-separated channel IDs (empty = all)
  allowedUserIds: string;    // Comma-separated user IDs (empty = all)
  model: string;             // Model to use (empty = current selected model)
  systemPrompt: string;      // System prompt override for Discord (empty = use default)
  maxResponseLength: number; // Max chars per Discord message (Discord limit 2000)
  respondToDMs: boolean;     // Whether to respond to DMs
  requireMention: boolean;   // Whether bot requires @mention in channels
}

export const DEFAULT_DISCORD_SETTINGS: DiscordSettings = {
  enabled: false,
  botToken: "",
  allowedChannelIds: "",
  allowedUserIds: "",
  model: "",
  systemPrompt: "",
  maxResponseLength: 2000,
  respondToDMs: true,
  requireMention: true,
};

// Encryption settings for chat history and workflow logs
export interface EncryptionSettings {
  enabled: boolean;  // Whether encryption keys are set up
  encryptChatHistory: boolean;  // Whether to encrypt AI chat history
  encryptWorkflowHistory: boolean;  // Whether to encrypt workflow execution logs
  publicKey: string;  // Base64 encoded public key (for encryption without password)
  encryptedPrivateKey: string;  // Base64 encoded encrypted private key
  salt: string;  // Base64 encoded salt for password derivation
}

export const DEFAULT_EDIT_HISTORY_SETTINGS: EditHistorySettings = {
  enabled: true,
  diff: {
    contextLines: 3,
  },
};

export const DEFAULT_ENCRYPTION_SETTINGS: EncryptionSettings = {
  enabled: false,
  encryptChatHistory: false,
  encryptWorkflowHistory: false,
  publicKey: "",
  encryptedPrivateKey: "",
  salt: "",
};

// 個別のRAG設定
export interface RagSetting {
  embeddingBaseUrl: string;      // Embedding API URL (空 = Gemini default)
  embeddingApiKey: string;       // APIキー (空 = Gemini API key fallback)
  embeddingModel: string;        // モデル名 (空 = Gemini default)
  chunkSize: number;             // default: 500
  chunkOverlap: number;          // default: 100
  pdfChunkPages: number;         // default: 6
  topK: number;                  // default: 5
  scoreThreshold: number;       // 最低スコア閾値 (0.0-1.0, default: 0.5)
  targetFolders: string[];      // 対象フォルダ（空の場合は全体）
  excludePatterns: string[];    // 正規表現パターンでファイルを除外
  searchFileExtensions: string[]; // 検索時のファイル拡張子フィルタ（空 = 全て）
  lastFullSync: number | null;
  externalIndexPath: string;    // 外部インデックスのパス（空 = 通常のvault sync）
  indexMultimodal: boolean;     // 画像/PDF/音声/動画もインデックス対象にする（Gemini native時のみ有効）
}

// Workspace状態ファイル（.gemini-workspace.json）
export interface WorkspaceState {
  selectedRagSetting: string | null;  // 現在選択中のRAG設定名
  selectedModel: ModelType | null;    // 現在選択中のモデル
  ragSettings: Record<string, RagSetting>;  // 設定��� -> RAG設定
  alwaysThinkModels?: string[];  // Always Think が有効なモデルID一覧
  discussionSettings?: DiscussionSettings;  // Discussion tab settings
}

/** Default Gemini embedding model (used when embeddingModel is empty and no custom baseUrl) */
export const DEFAULT_GEMINI_EMBEDDING_MODEL = "gemini-embedding-2-preview";

// デフォルトのRAG設定
export const DEFAULT_RAG_SETTING: RagSetting = {
  embeddingBaseUrl: "",
  embeddingApiKey: "",
  embeddingModel: "",
  chunkSize: 500,
  chunkOverlap: 100,
  pdfChunkPages: 6,
  topK: 5,
  scoreThreshold: 0.3,
  targetFolders: [],
  excludePatterns: [],
  searchFileExtensions: [],
  lastFullSync: null,
  externalIndexPath: "",
  indexMultimodal: false,
};

// デフォルトのWorkspace状態
export const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  selectedRagSetting: null,
  selectedModel: null,
  ragSettings: {},
};


// ==================== Discussion types ====================

// Discussion participant (uses any model, not just CLI)
export interface DiscussionParticipant {
  id: string;                // Unique ID (e.g., "p-1712345678")
  model: ModelType;          // Any available model
  displayName: string;       // Display name shown in UI
  role?: string;             // Optional role (e.g., "Affirmative", "Critical")
}

// Discussion voter
export interface DiscussionVoter {
  id: string;
  model: ModelType;
  displayName: string;
}

// Discussion phase
export type DiscussionPhase =
  | "idle"
  | "thinking"
  | "turn_complete"
  | "concluding"
  | "voting"
  | "complete"
  | "error";

// Discussion turn
export interface DiscussionTurn {
  turnNumber: number;
  responses: DiscussionResponse[];
  timestamp: number;
}

// Individual response in a turn
export interface DiscussionResponse {
  participantId: string;
  displayName: string;
  content: string;
  isConclusion: boolean;
  timestamp: number;
  error?: string;
}

// Final conclusion from a participant
export interface DiscussionConclusion {
  participantId: string;
  displayName: string;
  content: string;
}

// Vote result
export interface DiscussionVoteResult {
  voterId: string;
  voterDisplayName: string;
  votedForId: string;
  votedForDisplayName: string;
  reason?: string;
}

// Complete discussion result
export interface DiscussionResult {
  theme: string;
  turns: DiscussionTurn[];
  conclusions: DiscussionConclusion[];
  votes: DiscussionVoteResult[];
  winnerId: string | null;
  winnerIds: string[];
  isDraw: boolean;
  finalConclusion: string;
  startTime: number;
  endTime: number;
  participants: DiscussionParticipant[];
  voters: DiscussionVoter[];
}

// Discussion settings (stored in workspace state)
export interface DiscussionSettings {
  systemPrompt: string;
  conclusionPrompt: string;
  votePrompt: string;
  outputFolder: string;
  defaultTurns: number;
  participants?: DiscussionParticipant[];
  voters?: DiscussionVoter[];
}

export const DEFAULT_DISCUSSION_SETTINGS: DiscussionSettings = {
  systemPrompt: "You are discussing a theme with other AI assistants. Share your thoughts concisely.",
  conclusionPrompt: `Based on all the discussion so far, please provide your FINAL CONCLUSION on the theme.
Be clear and decisive. Summarize your position in a well-structured manner.
Start your response with "CONCLUSION:" followed by your final answer.`,
  votePrompt: `You have seen the conclusions from all participants.
Now you must vote for the BEST conclusion (you can also vote for your own if you believe it's the best).
Consider clarity, logical reasoning, and completeness.`,
  outputFolder: "discussions",
  defaultTurns: 2,
};

// Discussion UI state
export interface DiscussionState {
  phase: DiscussionPhase;
  currentTurn: number;
  totalTurns: number;
  theme: string;
  turns: DiscussionTurn[];
  conclusions: DiscussionConclusion[];
  votes: DiscussionVoteResult[];
  winnerId: string | null;
  winnerIds: string[];
  isDraw: boolean;
  finalConclusion: string;
  error?: string;
  streamingResponses: Map<string, string>;
  startTime?: number;
  endTime?: number;
  participants: DiscussionParticipant[];
  voters: DiscussionVoter[];
  // User interaction
  pendingUserInput?: {
    type: "debate" | "vote";
    participantId: string;
    role?: string;
  };
}

// ==================== End Discussion types ====================

// Supported local LLM frameworks
export type LlmFramework = "ollama" | "lm-studio" | "anythingllm" | "vllm" | "opencode";

// Local LLM configuration (OpenAI-compatible API)
export interface LocalLlmConfig {
  id: string;                   // Stable per-entry id (used in `local-llm:${id}:${model}` names)
  name?: string;                // Optional display name; defaults to framework + model
  framework: LlmFramework;     // Which LLM framework is being used
  baseUrl: string;              // e.g. "http://localhost:11434" (Ollama) or "http://localhost:1234" (LM Studio)
  /**
   * Default / single model. Kept for backward compatibility with the original
   * one-model-per-config schema; new code should prefer `enabledModels` and
   * resolve the requested model from the identifier instead.
   */
  model: string;
  /** Models the user has selected for this config (one dropdown entry each). */
  enabledModels?: string[];
  apiKey?: string;              // Optional API key (for services that require it)
  temperature?: number;         // 0.0-2.0 (undefined = server default)
  maxTokens?: number;           // Max response tokens (undefined = server default)
  username?: string;            // Basic Auth username (e.g. OpenCode local server)
  password?: string;            // Basic Auth password (e.g. OpenCode local server)
  verified?: boolean;           // Whether this entry has been verified
  enabled?: boolean;            // Whether this entry appears in the chat dropdown
  availableModels?: string[];   // Models discovered during verify
  /**
   * Models that returned a tools-related error and have been auto-downgraded
   * to the marker-based skill flow. Vault tools / function calling are not
   * sent to these models on subsequent requests until the user clears the
   * list from settings. Empty / unset means tools are attempted by default.
   */
  toolsUnsupportedModels?: string[];
}

/**
 * Frameworks whose endpoints accept the OpenAI `/v1/chat/completions` shape
 * (and therefore can route through `openaiChatWithToolsStream` for native
 * function-calling support). Ollama is intentionally excluded because the
 * existing path uses Ollama's native `/api/chat` and a separate tool format;
 * users wanting tools with Ollama can point the entry at the `/v1` endpoint
 * via the lm-studio framework. OpenCode local has its own session API.
 */
export function isToolsCompatibleFramework(framework: LlmFramework): boolean {
  return framework === "lm-studio" || framework === "anythingllm" || framework === "vllm";
}

/** True if the user's vault tools should be attempted for this config + model. */
export function isLocalLlmToolsEnabled(config: LocalLlmConfig, modelName: string): boolean {
  if (!isToolsCompatibleFramework(config.framework)) return false;
  return !(config.toolsUnsupportedModels?.includes(modelName));
}

export const DEFAULT_LOCAL_LLM_CONFIG: LocalLlmConfig = {
  id: "",
  framework: "ollama",
  baseUrl: "http://localhost:11434",
  model: "",
};

/** Human-readable label for a local LLM entry — used in dropdowns and messages. */
export function localLlmDisplayName(config: LocalLlmConfig, modelOverride?: string): string {
  const trimmedName = config.name?.trim() ?? "";
  // For named entries, only append a model when one is actually known so we
  // don't fall back to "(ollama)"-style framework labels that look like real
  // model ids. For unnamed entries, the framework is the most informative
  // last-resort label.
  const modelPart = modelOverride || config.model || config.enabledModels?.[0] || "";
  if (trimmedName) {
    return modelPart ? `${trimmedName} (${modelPart})` : trimmedName;
  }
  return `Local LLM (${modelPart || config.framework})`;
}

// Chat provider types
export type ChatProvider = "api" | "gemini-cli" | "claude-cli" | "codex-cli" | "local-llm" | "api-provider";  // "api-provider" kept for legacy; new code uses isApiProviderModel()

// API provider types for multi-provider support
export type ApiProviderType = "gemini" | "openai" | "anthropic" | "openrouter" | "grok" | "opencodego" | "opencodezen" | "custom";

export interface ApiProviderConfig {
  id: string;
  name: string;
  type: ApiProviderType;
  baseUrl: string;
  apiKey: string;
  enabledModels: string[];       // Models the user has checked for use
  availableModels: string[];
  verified: boolean;
  enabled: boolean;
}

export const KNOWN_PROVIDER_DEFAULTS: Record<string, { baseUrl: string; displayName: string }> = {
  gemini: { baseUrl: "https://generativelanguage.googleapis.com", displayName: "Gemini" },
  openai: { baseUrl: "https://api.openai.com", displayName: "OpenAI" },
  anthropic: { baseUrl: "https://api.anthropic.com", displayName: "Anthropic" },
  openrouter: { baseUrl: "https://openrouter.ai/api", displayName: "OpenRouter" },
  grok: { baseUrl: "https://api.x.ai", displayName: "Grok" },
  opencodego: { baseUrl: "https://opencode.ai/zen/go", displayName: "OpenCode Go" },
  opencodezen: { baseUrl: "https://opencode.ai/zen", displayName: "OpenCode Zen" },
};

export interface CliProviderConfig {
  cliVerified?: boolean;        // Whether Gemini CLI has been verified
  claudeCliVerified?: boolean;  // Whether Claude CLI has been verified
  codexCliVerified?: boolean;   // Whether Codex CLI has been verified
  geminiCliPath?: string;       // Custom path for Gemini CLI
  claudeCliPath?: string;       // Custom path for Claude CLI
  codexCliPath?: string;        // Custom path for Codex CLI
}

export const DEFAULT_CLI_CONFIG: CliProviderConfig = {
  cliVerified: false,
  claudeCliVerified: false,
  codexCliVerified: false,
};

// Helper to check if any CLI is verified
export function hasVerifiedCli(config: CliProviderConfig): boolean {
  return !!(config.cliVerified || config.claudeCliVerified || config.codexCliVerified);
}

// Model types: CLI backends + Local LLM entries + API provider models
// API format: "api:{providerId}:{modelName}"
// Local LLM format: "local-llm:{configId}"  (bare "local-llm" is accepted
// for backward-compat and resolves to the first verified entry.)
export type ModelType =
  | "gemini-cli"
  | "claude-cli"
  | "codex-cli"
  | "local-llm"
  | `local-llm:${string}`
  | `api:${string}`;

// Helper: get API key from first enabled Gemini provider
export function getGeminiApiKey(settings: LlmHubSettings): string {
  return settings.apiProviders.find(p => p.type === "gemini" && p.enabled)?.apiKey ?? "";
}

// Helper functions for API provider model detection
export function isApiProviderModel(model: string): boolean {
  return model.startsWith("api:");
}

/** Extract provider ID from "api:{providerId}:{model}" or legacy "api:{providerId}" */
export function getApiProviderId(model: string): string {
  const rest = model.slice(4); // Remove "api:" prefix
  const colonIdx = rest.indexOf(":");
  return colonIdx >= 0 ? rest.slice(0, colonIdx) : rest;
}

/** Extract model name from "api:{providerId}:{model}" */
export function getApiProviderModelName(model: string): string {
  const rest = model.slice(4);
  const colonIdx = rest.indexOf(":");
  return colonIdx >= 0 ? rest.slice(colonIdx + 1) : "";
}

// Helper functions for local LLM model detection
export function isLocalLlmModel(model: string): boolean {
  return model === "local-llm" || model.startsWith("local-llm:");
}

/**
 * Extract config id from a local LLM identifier.
 *
 * - `"local-llm"`              → `""` (legacy bare form)
 * - `"local-llm:{id}"`         → `"{id}"`
 * - `"local-llm:{id}:{model}"` → `"{id}"` (id stops at the first colon)
 */
export function getLocalLlmId(model: string): string {
  if (model === "local-llm") return "";
  if (!model.startsWith("local-llm:")) return "";
  const rest = model.slice("local-llm:".length);
  const colonIdx = rest.indexOf(":");
  return colonIdx >= 0 ? rest.slice(0, colonIdx) : rest;
}

/**
 * Extract the explicit model name from `local-llm:{id}:{model}`. Model names
 * may themselves contain `:` or `/`, so we stop only at the first colon
 * (which separates id from model). Returns `""` when the identifier has no
 * model suffix.
 */
export function getLocalLlmModelName(model: string): string {
  if (!model.startsWith("local-llm:")) return "";
  const rest = model.slice("local-llm:".length);
  const colonIdx = rest.indexOf(":");
  return colonIdx >= 0 ? rest.slice(colonIdx + 1) : "";
}

/**
 * Resolve the LocalLlmConfig that should back a `local-llm:{id}:{model}`
 * (or legacy `local-llm:{id}` / `local-llm`) name for chat / discussion /
 * discord — i.e. paths that actually run inference.
 *
 * Returns only configs that are both `verified` and not `enabled === false`
 * so a stale reference (from saved workspace state, a discussion participant,
 * or a Discord conversation) can't accidentally route to a disabled entry.
 *
 * The returned config has `model` overlaid with the model name from the
 * identifier when it is present and listed in `enabledModels` (or in
 * `availableModels` as a fallback). This lets one config back several
 * dropdown entries — one per selected model.
 *
 * Use {@link findLocalLlmConfigById} for settings UI / display lookups that
 * should still resolve disabled entries.
 */
export function getLocalLlmConfig(
  model: string,
  settings: LlmHubSettings,
): LocalLlmConfig | null {
  if (!isLocalLlmModel(model)) return null;
  const configs = settings.localLlmConfigs ?? [];
  const isActive = (c: LocalLlmConfig) => c.verified === true && c.enabled !== false;
  const id = getLocalLlmId(model);

  let base: LocalLlmConfig | null = null;
  if (id) {
    const match = configs.find(c => c.id === id);
    base = match && isActive(match) ? match : null;
  } else {
    base = configs.find(isActive) ?? null;
  }
  if (!base) return null;

  // Overlay the requested model name so the same config can back multiple
  // dropdown entries (one per enabledModel). If the identifier omits the
  // model suffix we fall back to the config's first enabled model, then to
  // its legacy single `model` field.
  const requested = getLocalLlmModelName(model);
  const candidates = base.enabledModels && base.enabledModels.length > 0
    ? base.enabledModels
    : (base.availableModels ?? []);
  let resolvedModel = base.model;
  if (requested) {
    if (candidates.includes(requested)) {
      resolvedModel = requested;
    } else {
      // Identifier names a model the config no longer offers — refuse rather
      // than silently substituting a different one.
      return null;
    }
  } else if (!resolvedModel && candidates.length > 0) {
    resolvedModel = candidates[0];
  }
  return { ...base, model: resolvedModel };
}

/**
 * Look up a Local LLM entry by id without filtering on verified/enabled.
 * Useful for rendering history (where the message was produced by what was
 * a valid config at the time) and for settings UIs that need to show
 * disabled entries.
 */
export function findLocalLlmConfigById(
  id: string,
  settings: LlmHubSettings,
): LocalLlmConfig | null {
  if (!id) return null;
  return (settings.localLlmConfigs ?? []).find(c => c.id === id) ?? null;
}

export interface ModelInfo {
  name: ModelType;
  displayName: string;
  description: string;
  isImageModel?: boolean;  // true if this model is for image generation
  isCliModel?: boolean;    // true if this model is CLI-based
  providerName?: string;   // Provider display name for grouping (e.g. "Gemini", "OpenRouter")
}

// CLI model definitions
export const CLI_MODEL: ModelInfo = {
  name: "gemini-cli",
  displayName: "Gemini CLI",
  description: "Google Gemini via command line (requires Google account)",
  isCliModel: true,
};

export const CLAUDE_CLI_MODEL: ModelInfo = {
  name: "claude-cli",
  displayName: "Claude CLI",
  description: "Anthropic Claude via command line (requires Anthropic account)",
  isCliModel: true,
};

export const CODEX_CLI_MODEL: ModelInfo = {
  name: "codex-cli",
  displayName: "Codex CLI",
  description: "OpenAI Codex via command line (requires OpenAI account)",
  isCliModel: true,
};

// Helper function to check if a model name is an image generation model (pattern-based)
export function isImageGenerationModel(modelName: string): boolean {
  return /image-preview|dall-e/i.test(modelName);
}

// Chat message types
// Generated image from Gemini
export interface GeneratedImage {
  mimeType: string;
  data: string;  // Base64 encoded image data
}

// MCP App info for rendering in messages
export interface McpAppInfo {
  serverUrl: string;
  serverHeaders?: Record<string, string>;
  serverConfig?: McpServerConfig;  // Full config for client recreation (supports stdio)
  toolResult: McpAppResult;
  uiResource?: McpAppUiResource | null;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  llmContent?: string;          // full content sent to the LLM (hidden from UI)
  timestamp: number;
  model?: ModelType;  // モデル名（assistantの場合のみ）
  toolsUsed?: string[];  // 使用したツール名の配列
  attachments?: Attachment[];  // 添付ファイル
  pendingEdit?: PendingEditInfo;  // 保留中の編集情報
  pendingEdits?: PendingEditInfo[];  // 複数の編集結果
  pendingDelete?: PendingDeleteInfo;  // 保留中の削除情報
  pendingDeletes?: PendingDeleteInfo[];  // 複数の削除結果
  pendingRename?: PendingRenameInfo;  // 保留中のリネーム情報
  pendingRenames?: PendingRenameInfo[];  // 複数のリネーム結果
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  ragUsed?: boolean;  // RAG（File Search）が使用されたか
  ragSources?: string[];  // RAG検索で見つかったソースファイル
  webSearchUsed?: boolean;  // Web Searchが使用されたか
  imageGenerationUsed?: boolean;  // Image Generationが使用されたか
  generatedImages?: GeneratedImage[];  // 生成された画像
  thinking?: string;  // モデルの思考内容（thinkingモデル用）
  skillsUsed?: string[];  // Names of active skills used
  mcpApps?: McpAppInfo[];  // MCP Apps with UI (MCP Apps拡張)
  usage?: StreamChunkUsage;  // Token usage and cost
  elapsedMs?: number;        // Response time in milliseconds
  interactionId?: string;    // Interactions API interaction ID for conversation chaining
}

// 保留中の編集情報
export interface PendingEditInfo {
  originalPath: string;
  status: "pending" | "applied" | "discarded" | "failed";
}

// 保留中の削除情報
export interface PendingDeleteInfo {
  path: string;
  status: "pending" | "deleted" | "cancelled" | "failed";
}

// 保留中のリネーム情報
export interface PendingRenameInfo {
  originalPath: string;
  newPath: string;
  status: "pending" | "applied" | "discarded" | "failed";
}

// 添付ファイル
export interface Attachment {
  name: string;
  type: "image" | "pdf" | "text" | "audio" | "video";
  mimeType: string;
  data: string;  // Base64エンコードされたデータ
  sourcePath?: string;  // RAG検索結果のソースファイルパス
  pageLabel?: string;  // PDFページ範囲（例: "pages 1-6 of 24"）
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
}

// Conversation history for Gemini API
export interface ConversationHistory {
  contents: Content[];
}

// Tool definition for Function Calling
export interface ToolPropertyDefinition {
  type: string;
  description: string;
  enum?: string[];
  properties?: Record<string, ToolPropertyDefinition>;
  required?: string[];
  items?: ToolPropertyDefinition | {
    type: string;
    properties?: Record<string, ToolPropertyDefinition>;
    required?: string[];
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolPropertyDefinition>;
    required?: string[];
  };
}

// Usage info for streaming chunks and messages
export interface StreamChunkUsage {
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
  totalTokens?: number;
  totalCost?: number;       // USD
}

// Streaming chunk types
export interface StreamChunk {
  type: "text" | "thinking" | "tool_call" | "tool_result" | "error" | "done" | "rag_used" | "web_search_used" | "image_generated" | "session_id";
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  error?: string;
  ragSources?: string[];  // RAG検索で見つかったソースファイル
  generatedImage?: GeneratedImage;  // 生成された画像
  sessionId?: string;  // CLI session ID for resumption
  usage?: StreamChunkUsage;  // Token usage and cost (populated on "done" chunks)
  interactionId?: string;  // Interactions API interaction ID (populated on "done" chunks)
}

// Get default model: first enabled+verified API provider (first enabled model), or first verified CLI
export function getDefaultModel(settings: LlmHubSettings): ModelType {
  const provider = settings.apiProviders.find(p => p.enabled && p.verified && p.enabledModels?.length > 0);
  if (provider) return `api:${provider.id}:${provider.enabledModels[0]}`;
  const cli = settings.cliConfig;
  if (cli?.cliVerified) return "gemini-cli";
  if (cli?.claudeCliVerified) return "claude-cli";
  if (cli?.codexCliVerified) return "codex-cli";
  const localLlm = (settings.localLlmConfigs ?? []).find(c => c.verified && c.enabled !== false);
  if (localLlm) {
    // Emit the same `local-llm:{id}:{model}` identifier shape that the Chat
    // dropdown produces, so the initial selection actually matches a visible
    // <option>.
    const firstModel = (localLlm.enabledModels && localLlm.enabledModels.length > 0)
      ? localLlm.enabledModels[0]
      : localLlm.model;
    if (firstModel) {
      return `local-llm:${localLlm.id}:${firstModel}` as ModelType;
    }
  }
  return "gemini-cli";
}

// Default slash commands
export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "cmd_infographic_default",
    name: "infographic",
    promptTemplate: "Convert the following content into an HTML infographic. Output the HTML directly in your response, do not create a note:\n\n{selection}",
    model: null,
    description: "Generate HTML infographic from selection or active note",
    searchSetting: null,
  },
];

/** Default workspace folder name. */
export const DEFAULT_WORKSPACE_FOLDER = "LLMHub";
/** Fixed skills folder name. */
export const SKILLS_FOLDER = "skills";
/** Fixed workflows folder name. */
export const WORKFLOWS_FOLDER = "workflows";

// Default settings
export const DEFAULT_SETTINGS: LlmHubSettings = {
  cliConfig: DEFAULT_CLI_CONFIG,
  localLlmConfigs: [],
  workspaceFolder: DEFAULT_WORKSPACE_FOLDER,
  hideWorkspaceFolder: true,
  saveChatHistory: true,
  systemPrompt: "",
  slashCommands: DEFAULT_SLASH_COMMANDS,
  enabledWorkflowHotkeys: [],
  enabledWorkflowEventTriggers: [],
  apiProviders: [],
  mcpServers: [],
  // Function call limits
  maxFunctionCalls: 20,
  functionCallWarningThreshold: 5,
  listNotesLimit: 50,
  maxNoteChars: 20000,
  // Privacy
  privacy: DEFAULT_PRIVACY_SETTINGS,
  // Edit history
  editHistory: DEFAULT_EDIT_HISTORY_SETTINGS,
  // Encryption
  encryption: DEFAULT_ENCRYPTION_SETTINGS,
  // Langfuse
  langfuse: DEFAULT_LANGFUSE_SETTINGS,
  // Discord
  discord: DEFAULT_DISCORD_SETTINGS,
};
