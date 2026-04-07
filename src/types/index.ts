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
  workflowId: string;        // Format: "path#name" (e.g., "folder/file.md#MyWorkflow")
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

  // Local LLM settings
  localLlmConfig: LocalLlmConfig;
  localLlmVerified: boolean;
  localLlmAvailableModels: string[];

  // Workspace settings
  workspaceFolder: string;
  hideWorkspaceFolder: boolean;
  saveChatHistory: boolean;
  systemPrompt: string;

  // Slash commands
  slashCommands: SlashCommand[];

  // Workflow hotkeys
  enabledWorkflowHotkeys: string[];  // Workflow identifiers in format "path#name" (e.g., "folder/file.md#MyWorkflow")

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
}

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
  // Hybrid search: combine vector similarity with keyword matching
  hybridSearch: boolean;        // default: true - enable hybrid vector+keyword search
  hybridKeywordWeight: number;  // default: 0.3 - weight for keyword score (0.0-1.0)
  // Context expansion: return surrounding chunks for better context
  contextExpansion: number;     // default: 1 - number of surrounding chunks to include (0=disabled)
  // Over-fetch: fetch more candidates then trim to topK for better recall
  overFetchEnabled: boolean;    // default: false - fetch overFetchTopN candidates then trim
  overFetchTopN: number;        // default: 20 - number of candidates to fetch before trimming
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
  hybridSearch: true,
  hybridKeywordWeight: 0.3,
  contextExpansion: 1,
  overFetchEnabled: false,
  overFetchTopN: 20,
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
export type LlmFramework = "ollama" | "lm-studio" | "anythingllm" | "vllm";

// Local LLM configuration (OpenAI-compatible API)
export interface LocalLlmConfig {
  framework: LlmFramework;     // Which LLM framework is being used
  baseUrl: string;              // e.g. "http://localhost:11434" (Ollama) or "http://localhost:1234" (LM Studio)
  model: string;                // e.g. "llama3", "mistral", "gemma2"
  apiKey?: string;              // Optional API key (for services that require it)
  temperature?: number;         // 0.0-2.0 (undefined = server default)
  maxTokens?: number;           // Max response tokens (undefined = server default)
}

export const DEFAULT_LOCAL_LLM_CONFIG: LocalLlmConfig = {
  framework: "ollama",
  baseUrl: "http://localhost:11434",
  model: "",
};

// Chat provider types
export type ChatProvider = "api" | "gemini-cli" | "claude-cli" | "codex-cli" | "local-llm" | "api-provider";  // "api-provider" kept for legacy; new code uses isApiProviderModel()

// API provider types for multi-provider support
export type ApiProviderType = "gemini" | "openai" | "anthropic" | "openrouter" | "grok" | "custom";

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

// Model types: CLI backends + API provider models
// API format: "api:{providerId}:{modelName}"
export type ModelType =
  | "gemini-cli"
  | "claude-cli"
  | "codex-cli"
  | "local-llm"
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

export const LOCAL_LLM_MODEL: ModelInfo = {
  name: "local-llm",
  displayName: "Local LLM",
  description: "Local LLM server (Ollama, LM Studio, vLLM, etc.)",
  isCliModel: true,
};

// Helper function to check if a model name is an image generation model (pattern-based)
export function isImageGenerationModel(modelName: string): boolean {
  return /image-preview|dall-e/i.test(modelName);
}

// RAG citation for detailed source attribution
export interface RagCitation {
  filePath: string;
  text: string;           // Matched chunk text snippet
  score: number;          // Relevance score
  chunkIndex: number;
  pageLabel?: string;     // For PDFs
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
  ragCitations?: RagCitation[];  // Detailed RAG citations with chunk text
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
  if (settings.localLlmVerified) return "local-llm";
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
  localLlmConfig: DEFAULT_LOCAL_LLM_CONFIG,
  localLlmVerified: false,
  localLlmAvailableModels: [],
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
  // Edit history
  editHistory: DEFAULT_EDIT_HISTORY_SETTINGS,
  // Encryption
  encryption: DEFAULT_ENCRYPTION_SETTINGS,
  // Langfuse
  langfuse: DEFAULT_LANGFUSE_SETTINGS,
  // Discord
  discord: DEFAULT_DISCORD_SETTINGS,
};
