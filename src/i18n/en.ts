import type { SharedTranslationKey } from "obsidian-llm-hub-common/i18n";

// English translations (base language)
export const en = {
  // Settings - Credential storage
  "settings.credentialStorage": "Credential storage",
  "settings.credentialStorage.mode": "Store API keys in",
  "settings.credentialStorage.plaintext": "Plugin settings (plaintext)",
  "settings.credentialStorage.secretStorage": "Obsidian secret storage",
  "settings.credentialStorage.plaintext.desc": "API keys, tokens, and passwords are stored as plaintext in the plugin settings and workspace state files. They follow whatever syncs your vault, so do not commit or share those files.",
  "settings.credentialStorage.secretStorage.desc": "API keys, tokens, and passwords are kept in Obsidian's secret storage and never written into the vault. Secret storage is per device, so you have to enter each credential again on every other device.",
  "settings.credentialStorage.unavailable": "Secret storage requires Obsidian 1.11.4 or later.",
  "settings.credentialStorage.configuredElsewhere": "Configured on another device. Enter it again to use it here.",
  "settings.credentialStorage.movedToSecretStorage": "Credentials moved to Obsidian secret storage.",
  "settings.credentialStorage.movedToPlaintext": "Credentials moved back into the plugin settings.",
  "settings.credentialStorage.switchFailed": "Failed to switch credential storage: {error}",
  "settings.credentialStorage.writeFailed": "Failed to write to Obsidian secret storage. Credentials were kept in the plugin settings as plaintext.",
  "settings.credentialStorage.workspaceMigrationFailed": "Failed to migrate the workspace credential in Obsidian secret storage.",
  // Settings - Headings
  "settings.cliProviders": "CLI providers",

  // Settings - API

  // Settings - CLI
  "settings.cliIntro": "Verify CLI providers to use them as models. Verified providers will appear in model selection.",
  "settings.cliInstall": "Install: {{cmd}}",
  "settings.cliVerified": "Verified",
  "settings.cliVerify": "Verify",
  "settings.cliDisable": "Disable",
  "settings.cliVerifying": "Verifying...",
  "settings.cliVerifyingCli": "Verifying CLI...",
  "settings.cliNotFound": "CLI not found: ",
  "settings.cliLoginRequired": "Login required: ",
  "settings.cliRunGeminiLogin": "Run 'agy' command and complete login with /auth",
  "settings.cliRunClaudeLogin": "Run 'claude' command and complete login",
  "settings.cliRunCodexLogin": "Run 'codex' command and complete login",
  "settings.geminiCliVerified": "Antigravity CLI verified",
  "settings.claudeCliVerified": "Claude CLI verified",
  "settings.codexCliVerified": "Codex CLI verified",
  "settings.geminiCliDisabled": "Antigravity CLI disabled",
  "settings.claudeCliDisabled": "Claude CLI disabled",
  "settings.codexCliDisabled": "Codex CLI disabled",
  "settings.codexCliModel": "Codex CLI model",
  "settings.codexCliModel.desc": "Select a model from the catalog reported by the installed Codex CLI.",
  "settings.codexCliModel.default": "Codex CLI default",
  "settings.codexCliModel.loadFailed": "Could not load the model catalog from Codex CLI. Check the CLI path and version.",
  "settings.codexCliReasoningEffort": "Codex reasoning effort",
  "settings.codexCliReasoningEffort.desc": "Choose how much reasoning Codex uses. Low is the default for faster text interactions.",
  "settings.cliPathSettings": "Configure CLI path",
  "settings.cliPathModal.title": "CLI path settings",
  "settings.cliPathModal.desc": "If the CLI is not detected automatically, specify the full path here. The plugin automatically searches common installation paths including version managers (nodenv, nvm, volta, fnm, asdf, mise).",
  "settings.cliPathModal.placeholder": "Path to CLI executable or script",
  "settings.cliPathModal.windowsNote": "Leave empty for auto-detection. To override Antigravity CLI, use the full path to agy.exe; Claude and Codex can use their standalone executable paths.",
  "settings.cliPathModal.unixNote": "Run in terminal to find the path:\nwhich agy (or which claude / which codex)",
  "settings.cliPathModal.versionManagerNote": "Node.js version managers (nodenv, nvm, volta, fnm, asdf, mise) are automatically detected. If detection fails, specify the CLI script path directly (e.g. ~/.local/bin/agy).",
  "settings.cliPathModal.clear": "Clear",
  "settings.cliPathModal.fileNotFound": "File not found. Please check the path.",
  "settings.cliPathModal.invalidChars": "Path contains invalid characters.",
  "settings.cliPathSaved": "CLI path saved",
  "settings.cliPathCleared": "CLI path cleared",

  // Settings - Local LLM
  "settings.localLlm": "Local LLM",
  "settings.localLlmDesc": "Connect to local LLM servers (Ollama, LM Studio, vLLM, etc.)",
  "settings.localLlmAdd": "Add local LLM",
  "settings.localLlmToolsDisabled": "Tools auto-disabled (model rejected function calling)",
  "settings.localLlmToolsClear": "Re-enable tools",
  "settings.localLlmVerified": "Local LLM verified",
  "settings.localLlmDisabled": "Local LLM disabled",
  "settings.localLlmConfigure": "Configure local LLM",
  "settings.localLlmModal.title": "Local LLM configuration",
  "settings.localLlmModal.desc": "Configure connection to your local LLM server.",
  "settings.localLlmModal.framework": "Framework",
  "settings.localLlmModal.frameworkDesc": "Select your LLM server framework",
  "settings.localLlmModal.baseUrl": "Base URL",
  "settings.localLlmModal.baseUrlDesc": "Server endpoint URL",
  "settings.localLlmModal.apiKey": "API key (optional)",
  "settings.localLlmModal.apiKeyDesc": "Required only for services that need authentication",
  "settings.localLlmModal.apiKeyDescAnythingllm": "Required for AnythingLLM API access",
  "settings.localLlmModal.apiKeyPlaceholder": "Enter API key",
  "settings.localLlmModal.username": "Username",
  "settings.localLlmModal.usernameDesc": "Optional. Sent as HTTP Basic Auth (matches OPENCODE_SERVER_USERNAME).",
  "settings.localLlmModal.usernamePlaceholder": "Username",
  "settings.localLlmModal.password": "Password",
  "settings.localLlmModal.passwordDesc": "Optional. Sent as HTTP Basic Auth (matches OPENCODE_SERVER_PASSWORD).",
  "settings.localLlmModal.passwordPlaceholder": "Password",
  "settings.localLlmModal.model": "Model",
  "settings.localLlmModal.modelDesc": "Fetch models from server, then pick one or more",
  "settings.localLlmModal.modelMultiDesc": "Each checked model becomes a separate entry in the chat dropdown.",
  "settings.localLlmModal.modelRequired": "Select at least one model",
  "settings.localLlmModal.fetchModels": "Fetch models",
  "settings.localLlmModal.fetching": "Fetching...",
  "settings.localLlmModal.modelsLoaded": "{{count}} models loaded",
  "settings.localLlmModal.noModelsFound": "No models found",
  "settings.localLlmModal.temperature": "Temperature",
  "settings.localLlmModal.temperatureDesc": "0.0-2.0 (empty = server default)",
  "settings.localLlmModal.maxTokens": "Max tokens",
  "settings.localLlmModal.maxTokensDesc": "Maximum response tokens (empty = server default)",
  "settings.localLlmModal.streamIdleTimeout": "Stream idle timeout (seconds)",
  "settings.localLlmModal.streamIdleTimeoutDesc": "Stop the request when the server sends no streaming data for this many seconds. Leave empty for 120 seconds. Large prompts may need a longer timeout.",
  "settings.localLlmModal.serverDefault": "Server default",
  "settings.localLlmModal.baseUrlRequired": "Base URL is required",
  "settings.localLlmModal.fetchRequired": "Please fetch models first",

  // Settings - API Providers
  "settings.apiProviders": "API providers",
  "settings.apiProviders.desc": "Connect to OpenAI-compatible API providers (OpenAI, OpenRouter, Grok, etc.)",
  "settings.apiProviderAdd": "Add provider",
  "settings.apiProviderEdit": "Edit provider",
  "settings.apiProviderDelete": "Delete provider",
  "settings.apiProviderDisabled": "Disabled",
  "settings.apiProviderConfigure": "Configure API provider",
  "settings.apiProviderType": "Provider type",
  "settings.apiProviderCustom": "Custom",
  "settings.apiProviderName": "Display name",
  "settings.apiProviderBaseUrl": "Base URL",
  "settings.apiProviderApiKey": "API key",
  "settings.proxy": "Proxy",
  "settings.proxyUrl": "Proxy URL",
  "settings.proxyUrl.desc": "HTTP(S) proxy for corporate gateways (e.g. http://proxy:8080)",
  "settings.proxyBypass": "Bypass list",
  "settings.proxyBypass.desc": "Comma-separated hosts that bypass the proxy (e.g. api.openai.com, localhost)",
  "settings.apiProviderModel": "Enabled models",
  "settings.apiProviderModel.desc": "Select which models to use. Click verify to discover available models.",
  "settings.pdfInputMode": "PDF input mode",
  "settings.pdfInputMode.desc": "Auto uses native PDF input for official Gemini, OpenAI, and Anthropic providers, and extracted text for other providers.",
  "settings.pdfInputMode.localDesc": "Auto extracts PDF text. Choose native only when the local server and model accept PDF file input.",
  "settings.pdfInputMode.auto": "Auto",
  "settings.pdfInputMode.native": "Native PDF",
  "settings.pdfInputMode.extractText": "Extract text",
  "settings.apiProviderModelFilter": "Filter models...",
  "settings.apiProviderAvailableModels": "Available models",
  "settings.apiProviderVerify": "Verify connection",
  "settings.apiProviderVerified": "Verified: {{count}} models found",
  "settings.apiProviderVerifyFailed": "Verification failed: {{error}}",
  "settings.apiProviderNameRequired": "Provider name is required",
  "settings.apiProviderApiKeyRequired": "API key is required",
  "settings.apiProviderVerifyRequired": "Please verify connection first",
  "chat.noApiProvider": "No API provider configured. Please add and verify a provider in settings.",

  // Settings - Workspace

  // Settings - Tool limits
  "settings.cloudVaultToolAllowedFolders": "LLM vault tool folders",
  "settings.cloudVaultToolAllowedFolders.desc": "Comma-separated folders that LLM vault tools and LLM-triggered skill workflows may access. Leave empty to allow the whole vault. This does not limit RAG, manual attachments, @note mentions, MCP tools, scripts, or shell commands.",
  "settings.cloudVaultToolAllowedFolders.placeholder": "Example: Public, Shared/Docs",
  "settings.skills": "Agent skills",
  "settings.skillsFolder.desc": "Vault-relative folder containing agent skills. Changing this does not move the existing folder. The folder icon is only shown for the default skills folder.",
  "settings.skillsFolder.invalidPath": "Absolute paths and \".\" or \"..\" path segments are not allowed. Please use a folder within the vault.",
  "settings.externalSkills": "External skills",
  "settings.externalSkillsRepository": "Source repository",
  "settings.externalSkillsRepository.desc": "Skills are imported from the official repository {{repo}} and copied into the configured skills folder. Each skill must include a manifest.json.",
  "settings.externalSkills.retry": "Retry",
  "settings.externalSkills.loading": "Loading available skills...",
  "settings.externalSkills.loadFailed": "Failed to load skills: {{error}}",
  "settings.externalSkills.noSkills": "No compatible skills found in the official repository.",
  "settings.externalSkills.allInstalled": "All available skills are already installed.",
  "settings.externalSkills.install": "Install a skill",
  "settings.externalSkills.install.desc": "Select a skill from the official repository and install it.",
  "settings.externalSkills.installButton": "Install",
  "settings.externalSkills.installSkipped": "Could not install {{id}}: {{reason}}",
  "settings.externalSkills.installed": "Installed skills",
  "settings.externalSkills.noVersion": "No version",
  "settings.externalSkills.updateAvailable": "Update available",
  "settings.externalSkills.check": "Check for updates",
  "settings.externalSkills.upToDate": "Already up to date (v{{version}}).",
  "settings.externalSkills.notInCatalog": "This skill is not in the official repository.",
  "settings.externalSkills.updateConfirm": "Update {{name}} from v{{from}} to v{{to}}?",
  "settings.importSkills.done": "Imported {{skills}} skill(s), {{files}} file(s)",
  "settings.importSkills.failed": "Failed to import skills: {{error}}",

  // Settings - Slash commands

  // Settings - Slash command modal

  // Settings - RAG
  "settings.scoreThreshold": "Score threshold",
  "settings.scoreThreshold.desc": "Minimum similarity score (0.0-1.0) to include in results. 0 = no filtering",

  // Settings - RAG Store
  "settings.localEmbeddingModel": "Embedding model",
  "settings.localEmbeddingModel.desc": "Model used for generating embeddings",
  "settings.localChunkSize": "Chunk size",
  "settings.localChunkSize.desc": "Number of characters per text chunk (100-2000)",
  "settings.localChunkOverlap": "Chunk overlap",
  "settings.localChunkOverlap.desc": "Number of overlapping characters between chunks (0-500)",
  "settings.localPdfChunkPages": "PDF chunk pages",
  "settings.localPdfChunkPages.desc": "Number of PDF pages per chunk (1-6)",
  "settings.indexMultimodal": "Index media files",
  "settings.indexMultimodal.desc": "Index images (PNG, JPEG), audio (MP3, WAV), and video (MP4) for semantic search. Requires Gemini embedding model. PDFs work with any provider. Gemini embeds the pages themselves, other providers embed the extracted text layer, so scanned PDFs without usable text cannot be indexed.",
  "settings.localSyncStatus": "Local index: {{chunks}} chunks from {{files}} files",
  "settings.localSyncBtn": "Sync local index",
  "settings.localSyncing": "Syncing...",
  "settings.localSyncResult": "Local sync: {{embedded}} embedded, {{skipped}} skipped, {{removed}} removed",
  "settings.localSyncFilesFailed": "Indexed {{count}} file(s) with 0 chunks because embedding failed:\n{{files}}",
  "settings.localClearIndex": "Clear local index",
  "settings.localClearIndex.desc": "Delete the local embedding index and vectors",
  "settings.localClearConfirm": "Are you sure you want to clear the local embedding index? You will need to re-sync to use local RAG.",
  "settings.localIndexCleared": "Local embedding index cleared",
  "settings.ragMode.desc": "Choose whether this setting builds its own index, combines internal indexes, or loads external indexes",
  "settings.ragMode.internal": "Internal",
  "settings.ragMode.combined": "Combine internal",
  "settings.ragMode.external": "External",
  "settings.ragSourceSettings.desc": "Select the internal RAG settings to search together",
  "settings.ragSourceSettings.empty": "No internal RAG settings available",
  "settings.externalIndex": "Use external index",
  "settings.externalIndex.desc": "Load a pre-built index instead of syncing from the vault",
  "settings.externalIndexPath": "External index paths",
  "settings.externalIndexPath.desc": "Absolute paths to directories containing index.json and vectors.bin. Use one path per line.",
  "settings.externalIndexPath.placeholder": "e.g. /path/to/indexes/domain-1\n/path/to/indexes/domain-2",
  "settings.externalIndexSyncDisabled": "Sync is disabled for external or combined index settings",
  "settings.externalEmbeddingBaseUrl.desc": "Embedding server URL for query embedding (empty = use Gemini API)",
  "settings.externalIndexModel": "Embedding model (from index)",
  "settings.externalIndexModel.desc": "Auto-detected from the external index file",
  "settings.externalIndexModel.loading": "Loading...",
  "settings.externalIndexModel.notFound": "Not found (index not loaded)",
  "settings.localApiKeyRequired": "Google API key is required for local embedding (used for Gemini embedding API)",
  "settings.localSyncEmbedding": "Embedding",
  "settings.localSyncSkipping": "Skipping",
  "settings.localSyncRemoving": "Removing",
  "settings.localEmbeddingBaseUrl": "Embedding API base URL",
  "settings.localEmbeddingBaseUrl.desc": "Custom embedding API base URL (leave empty for Gemini default). Use for Ollama, OpenAI, or other OpenAI-compatible embedding servers.",
  "settings.localEmbeddingBaseUrl.placeholder": "e.g. http://localhost:11434",
  "settings.localEmbeddingApiKey": "Embedding API key",
  "settings.localEmbeddingApiKey.desc": "API key for embedding server (optional)",
  "settings.localEmbeddingApiKey.placeholder": "Enter embedding API key",
  "settings.searchFileExtensions": "Search file extensions",
  "settings.searchFileExtensions.desc": "Comma-separated file extensions to include in search results (empty = all). E.g., md, pdf",
  "settings.searchFileExtensions.placeholder": "md, pdf",

  // Settings - Sync

  // Common buttons
  "common.ok": "OK",
  "common.error": "Error: ",

  // RAG Setting Name Modal
  "modal.nameCannotBeEmpty": "Name cannot be empty",
  "modal.name": "Name",
  "modal.enterName": "Enter name",

  // Chat
  "chat.savedAsNote": "Saved as {{path}}",
  "chat.chatDeleted": "Chat deleted",
  "chat.configGeminiCli": "Antigravity CLI",
  "chat.configGeminiCliDesc": "Enable CLI mode and verify the agy command is working",
  "chat.configClaudeCli": "Claude CLI",
  "chat.configClaudeCliDesc": "Enable CLI mode and verify the claude command is working",
  "chat.configLocalLlm": "Local LLM",
  "chat.configLocalLlmDesc": "Connect to a local LLM server (Ollama, LM Studio, etc.)",
  "chat.rateLimitPaid": "This model may be rate limited. Please try a different model until tomorrow.",
  "chat.errorOccurred": "Sorry, an error occurred: {{message}}",
  "chat.unknownError": "Unknown error",
  "chat.localLlmNotConfigured": "The selected local LLM entry is not configured. Pick another model or add one in settings.",
  "chat.compactNotAvailable": "Compact is not available in CLI mode",
  "chat.helpTitle": "LLM Hub help",
  "chat.helpDescription": "Enable the built-in help knowledge bundle and ask about LLM Hub features, settings, workflows, search, dashboards, and troubleshooting.",
  "chat.askLlmHubHelp": "Ask about LLM Hub",
  "chat.helpQuestionDraft": "What can LLM Hub do?",
  "chat.yesterday": "Yesterday",

  // InputArea
  "input.ragPdfChunkPages": "PDF chunk pages",
  "input.thinkingLabel": "Always think",

  // MessageBubble
  // Diff viewer
  "diff.restoreSize": "Restore size",

  // Tool display labels
  "tool.ragSearched": "RAG search",

  // Workflow Panel - Node Types

  // Workflow Panel - UI Strings

  // Common - Edit

  // Edit Confirmation Modal

  // Value Prompt Modal

  // Dialog Prompt Modal (titles passed dynamically)

  // Edit History

  // Workflow Modals

  // Edit History Modal
  "editHistoryModal.confirmClearWithRemote": "Restore to remote state and clear history?",

  // Diff Modal

  // Edit History Buttons
  "editHistoryModal.showRemote": "Show remote",
  "editHistoryModal.loadingRemote": "Loading...",
  "editHistoryModal.originLocal": "Local",
  "editHistoryModal.originRemote": "Remote",

  // Status bar

  // Commands

  // Workflow Selector Modal

  // Errors

  // Encryption
  "settings.encryption": "Encryption",
  "settings.encryptChatHistory": "Encrypt AI chat history",
  "settings.encryptChatHistory.desc": "Encrypt AI chat history files. Requires password to view content.",
  "settings.encryptWorkflowHistory": "Encrypt workflow execution logs",
  "settings.encryptWorkflowHistory.desc": "Encrypt workflow execution log files. Requires password to view content.",
  "settings.encryptionSetup": "Setup encryption",
  "settings.encryptionSetup.desc": "Generate encryption keys. You can encrypt without password, but need password to decrypt.",
  "settings.encryptionSetupBtn": "Setup encryption keys",
  "settings.encryptionPassword": "Encryption password",
  "settings.encryptionPassword.desc": "Password to protect private key. Required for decryption.",
  "settings.encryptionPassword.placeholder": "Enter password",
  "settings.encryptionConfirmPassword": "Confirm password",
  "settings.encryptionConfirmPassword.placeholder": "Confirm password",
  "settings.encryptionPasswordMismatch": "Passwords do not match",
  "settings.encryptionSetupSuccess": "Encryption keys generated successfully",
  "settings.encryptionSetupFailed": "Failed to setup encryption: {{error}}",
  "settings.encryptionConfigured": "Encryption configured",
  "settings.encryptionConfigured.desc": "Encryption keys are set up. Choose which logs to encrypt below.",
  "settings.encryptionResetKeys": "Reset encryption keys",
  "settings.encryptionResetKeys.desc": "Generate new encryption keys. Previous encrypted chats will not be readable.",
  "settings.encryptionResetKeysConfirm": "Reset encryption keys? All previously encrypted chat history will become unreadable.",
  "settings.encryptionKeysReset": "Encryption keys have been reset",

  // Decryption
  "chat.encryptedChat": "Encrypted chat",
  "chat.decryptFailed": "Decryption failed. Check your password.",
  "chat.decrypted": "Decrypted successfully",

  // Workflow Generation Modal
  "workflow.generation.generatingWithCli": "Generating with {{cli}}",

  // Workflow Preview Modal

  // Workflow Confirm Modal

  // Execution History Select Modal

  // Workflow Execution Modal

  // CryptView - File Encryption

  // Skills Settings

  // Skills UI

  // MCP Server Settings
  "settings.mcpTransport": "Transport",
  "settings.mcpTransport.http": "HTTP (streamable HTTP)",
  "settings.mcpTransport.stdio": "Stdio (local process)",
  "settings.mcpTransport.stdioDesktopOnly": "Stdio transport is only available on desktop",
  "settings.mcpServerCommand": "Command",
  "settings.mcpServerCommand.placeholder": "npx, uvx, or /path/to/server",
  "settings.mcpServerArgs": "Arguments",
  "settings.mcpServerArgs.placeholder": "-y @modelcontextprotocol/server-name",
  "settings.mcpServerFraming": "Framing protocol",
  "settings.mcpServerFraming.contentLength": "Content-Length (legacy/custom)",
  "settings.mcpServerFraming.newline": "Newline-delimited (standard MCP)",
  "settings.mcpServerEnv": "Environment variables (JSON)",
  "settings.mcpServerEnv.placeholder": "{\"API_KEY\": \"xxx\"}",
  "settings.mcpServerEnv.desc": "Optional environment variables for the server process (JSON format)",
  "settings.mcpServerCommandRequired": "Command is required for stdio transport",
  "settings.mcpServerInvalidEnv": "Invalid JSON for environment variables",

  // Input - MCP tool hint

  // HTML Preview Modal

  // AI Workflow Modal

  // Edit History Modal

  // Node Editor Modal

  // MCP Apps

  // Langfuse settings

  // Discord integration
  "settings.discord": "Discord integration",
  "settings.discordEnabled": "Enable Discord bot",
  "settings.discordEnabled.desc": "Start the Discord bot when the plugin loads",
  "settings.discordBotToken": "Bot token",
  "settings.discordBotToken.desc": "Discord bot token from the developer portal (bot → token)",
  "settings.discordBotToken.placeholder": "Enter your Discord bot token",
  "settings.discordConnection": "Connection",
  "settings.discordConnection.desc": "Connect or disconnect the Discord bot",
  "settings.discordConnect": "Connect",
  "settings.discordDisconnect": "Disconnect",
  "settings.discordVerifying": "Verifying...",
  "settings.discordStatusConnected": "Bot is connected",
  "settings.discordStatusDisconnected": "Bot is not connected",
  "settings.discordDisconnected": "Discord bot disconnected",
  "settings.discordVerifyFailed": "Discord token verification failed: {{error}}",
  "settings.discordStartFailed": "Discord bot failed to start: {{error}}",
  "settings.discordRespondToDMs": "Respond to DMs",
  "settings.discordRespondToDMs.desc": "Whether the bot responds to direct messages",
  "settings.discordRequireMention": "Require @mention in channels",
  "settings.discordRequireMention.desc": "When enabled, the bot only responds when mentioned in server channels",
  "settings.discordAllowedChannels": "Allowed channel IDs",
  "settings.discordAllowedChannels.desc": "Comma-separated Discord channel IDs. Leave empty to allow all channels.",
  "settings.discordAllowedChannels.placeholder": "123456789,987654321",
  "settings.discordAllowedUsers": "Allowed user IDs",
  "settings.discordAllowedUsers.desc": "Comma-separated Discord user IDs. Leave empty to allow all users.",
  "settings.discordAllowedUsers.placeholder": "123456789,987654321",
  "settings.discordModel": "Model",
  "settings.discordModel.desc": "Model to use for Discord responses (e.g. api:provider_id:model_name). Leave empty to use the current selected model.",
  "settings.discordModel.placeholder": "Use current model",
  "settings.discordSystemPrompt": "System prompt",
  "settings.discordSystemPrompt.desc": "Custom system prompt for Discord responses. Leave empty to use the default.",
  "settings.discordSystemPrompt.placeholder": "You are a helpful assistant on Discord...",
  "settings.discordMaxResponseLength": "Max response length",
  "settings.discordMaxResponseLength.desc": "Maximum characters per Discord message (Discord limit: 2000)",

  // Search tab
  "search.discussWithSelected": "Discuss with selected",
  "search.pdfMode": "PDF results",
  "search.helpTitle": "Parameter help",
  "search.helpTopK": "Top K — maximum number of results to return.",
  "search.helpScoreThreshold": "Min score — Minimum similarity score (0.0–1.0). Results below this threshold are excluded.",
  "search.helpExt": "Ext. — Comma-separated file extensions to filter results (e.g., md, pdf). Empty means all files.",
  "search.helpChunkSize": "Chunk size — number of characters per text chunk when indexing. Larger chunks retain more context but may reduce precision.",
  "search.helpChunkOverlap": "Chunk overlap — number of overlapping characters between adjacent chunks. Helps preserve context at chunk boundaries.",
  "search.helpPdfChunkPages": "PDF chunk pages — number of pages grouped into a single chunk when indexing PDFs.",

  // RAG source modal

  "chat.dashboardCreateNamePrompt": "Dashboard name",

  "okf.builtinHelpDescription": "Built-in LLM Hub feature reference",

};

/** This plugin's own keys, plus everything the shared package defines. */
export type TranslationKey = keyof typeof en | SharedTranslationKey;
