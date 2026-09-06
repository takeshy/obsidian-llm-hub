// Chinese (Simplified) translations
export const zh: Record<string, string> = {
  // Settings - Headings
  "settings.cliProviders": "CLI 提供商",

  // Settings - API

  // Settings - CLI
  "settings.cliIntro": "验证 CLI 提供商以将其用作模型。已验证的提供商将显示在模型选择中。",
  "settings.cliInstall": "安装：{{cmd}}",
  "settings.cliVerified": "已验证",
  "settings.cliVerify": "验证",
  "settings.cliDisable": "禁用",
  "settings.cliVerifying": "验证中...",
  "settings.cliVerifyingCli": "正在验证 CLI...",
  "settings.cliNotFound": "未找到 CLI：",
  "settings.cliLoginRequired": "需要登录：",
  "settings.cliRunGeminiLogin": "运行 'agy' 命令并使用 /auth 完成登录",
  "settings.cliRunClaudeLogin": "运行 'claude' 命令并完成登录",
  "settings.cliRunCodexLogin": "运行 'codex' 命令并完成登录",
  "settings.geminiCliVerified": "Antigravity CLI 已验证",
  "settings.claudeCliVerified": "Claude CLI 已验证",
  "settings.codexCliVerified": "Codex CLI 已验证",
  "settings.geminiCliDisabled": "Antigravity CLI 已禁用",
  "settings.claudeCliDisabled": "Claude CLI 已禁用",
  "settings.codexCliDisabled": "Codex CLI 已禁用",
  "settings.cliPathSettings": "配置 CLI 路径",
  "settings.cliPathModal.title": "CLI 路径设置",
  "settings.cliPathModal.desc": "如果 CLI 未被自动检测到，请在此处指定完整路径。插件会自动搜索常见安装路径，包括版本管理器（nodenv、nvm、volta、fnm、asdf、mise）。",
  "settings.cliPathModal.placeholder": "CLI 可执行文件或脚本的路径",
  "settings.cliPathModal.windowsNote": "Leave empty for auto-detection. To override Antigravity CLI, use the full path to agy.exe; Claude and Codex can use their standalone executable paths.",
  "settings.cliPathModal.unixNote": "在终端中运行以下命令查找路径:\nwhich agy（或 which claude / which codex）",
  "settings.cliPathModal.versionManagerNote": "Node.js 版本管理器（nodenv、nvm、volta、fnm、asdf、mise）会被自动检测。如果检测失败，请直接指定 CLI 脚本路径（例如：~/.local/bin/agy）。",
  "settings.cliPathModal.clear": "清除",
  "settings.cliPathModal.fileNotFound": "文件未找到。请检查路径。",
  "settings.cliPathModal.invalidChars": "路径包含无效字符。",
  "settings.cliPathSaved": "CLI 路径已保存",
  "settings.cliPathCleared": "CLI 路径已清除",

  // Settings - Local LLM
  "settings.localLlm": "本地 LLM",
  "settings.localLlmDesc": "连接本地 LLM 服务器（Ollama、LM Studio、vLLM 等）",
  "settings.localLlmAdd": "添加本地 LLM",
  "settings.localLlmToolsDisabled": "工具已自动禁用（模型拒绝了函数调用）",
  "settings.localLlmToolsClear": "重新启用工具",
  "settings.localLlmVerified": "本地 LLM 已验证",
  "settings.localLlmDisabled": "本地 LLM 已禁用",
  "settings.localLlmConfigure": "配置本地 LLM",
  "settings.localLlmModal.title": "本地 LLM 配置",
  "settings.localLlmModal.desc": "配置与本地 LLM 服务器的连接。",
  "settings.localLlmModal.framework": "框架",
  "settings.localLlmModal.frameworkDesc": "选择您的 LLM 服务器框架",
  "settings.localLlmModal.baseUrl": "基础 URL",
  "settings.localLlmModal.baseUrlDesc": "服务器端点 URL",
  "settings.localLlmModal.apiKey": "API 密钥（可选）",
  "settings.localLlmModal.apiKeyDesc": "仅需要身份验证的服务才需要",
  "settings.localLlmModal.apiKeyDescAnythingllm": "AnythingLLM API 访问所需",
  "settings.localLlmModal.apiKeyPlaceholder": "输入 API 密钥",
  "settings.localLlmModal.username": "用户名",
  "settings.localLlmModal.usernameDesc": "可选。作为 HTTP Basic Auth 发送（对应 OPENCODE_SERVER_USERNAME）。",
  "settings.localLlmModal.usernamePlaceholder": "用户名",
  "settings.localLlmModal.password": "密码",
  "settings.localLlmModal.passwordDesc": "可选。作为 HTTP Basic Auth 发送（对应 OPENCODE_SERVER_PASSWORD）。",
  "settings.localLlmModal.passwordPlaceholder": "密码",
  "settings.localLlmModal.model": "模型",
  "settings.localLlmModal.modelDesc": "从服务器获取模型，然后选择一个或多个",
  "settings.localLlmModal.modelMultiDesc": "每个勾选的模型在聊天下拉菜单中作为单独条目显示。",
  "settings.localLlmModal.modelRequired": "请至少选择一个模型",
  "settings.localLlmModal.fetchModels": "获取模型",
  "settings.localLlmModal.fetching": "获取中...",
  "settings.localLlmModal.modelsLoaded": "已加载 {{count}} 个模型",
  "settings.localLlmModal.noModelsFound": "未找到模型",
  "settings.localLlmModal.temperature": "温度",
  "settings.localLlmModal.temperatureDesc": "0.0-2.0（空 = 服务器默认值）",
  "settings.localLlmModal.maxTokens": "最大令牌数",
  "settings.localLlmModal.maxTokensDesc": "最大响应令牌数（空 = 服务器默认值）",
  "settings.localLlmModal.serverDefault": "服务器默认值",
  "settings.localLlmModal.baseUrlRequired": "基础 URL 是必需的",
  "settings.localLlmModal.fetchRequired": "请先获取模型",

  // Settings - API 提供商
  "settings.apiProviders": "API 提供商",
  "settings.apiProviders.desc": "连接到 OpenAI 兼容的 API 提供商（OpenAI、OpenRouter、Grok 等）",
  "settings.apiProviderAdd": "添加提供商",
  "settings.apiProviderEdit": "编辑提供商",
  "settings.apiProviderDelete": "删除提供商",
  "settings.apiProviderDisabled": "已禁用",
  "settings.apiProviderConfigure": "配置 API 提供商",
  "settings.apiProviderType": "提供商类型",
  "settings.apiProviderCustom": "自定义",
  "settings.apiProviderName": "显示名称",
  "settings.apiProviderBaseUrl": "基础 URL",
  "settings.apiProviderApiKey": "API 密钥",
  "settings.proxy": "代理",
  "settings.proxyUrl": "代理 URL",
  "settings.proxyUrl.desc": "企业网关的 HTTP(S) 代理（例如 http://proxy:8080）",
  "settings.proxyBypass": "排除列表",
  "settings.proxyBypass.desc": "不经过代理的主机（逗号分隔，例如 api.openai.com, localhost）",
  "settings.apiProviderModel": "启用的模型",
  "settings.apiProviderModel.desc": "选择要使用的模型。点击验证以发现可用模型。",
  "settings.apiProviderModelFilter": "搜索模型...",
  "settings.apiProviderAvailableModels": "可用模型",
  "settings.apiProviderVerify": "验证连接",
  "settings.apiProviderVerified": "已验证：找到 {{count}} 个模型",
  "settings.apiProviderVerifyFailed": "验证失败：{{error}}",
  "settings.apiProviderNameRequired": "提供商名称为必填项",
  "settings.apiProviderApiKeyRequired": "API 密钥为必填项",
  "settings.apiProviderVerifyRequired": "请先验证连接",
  "chat.noApiProvider": "未配置 API 提供商。请在设置中添加并验证提供商。",

  // Settings - Workspace

  // Settings - Tool limits

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
  "settings.localPdfChunkPages": "PDF分块页数",
  "settings.localPdfChunkPages.desc": "每个分块的PDF页数 (1-6)",
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
  "settings.localApiKeyRequired": "Google API key is required for local embedding (used for Gemini Embedding API)",
  "settings.localSyncEmbedding": "Embedding",
  "settings.localSyncSkipping": "Skipping",
  "settings.localSyncRemoving": "Removing",
  "settings.localEmbeddingBaseUrl": "嵌入 API 基础 URL",
  "settings.localEmbeddingBaseUrl.desc": "自定义嵌入 API 基础 URL（留空使用 Gemini 默认值）。用于 Ollama、OpenAI 或其他 OpenAI 兼容的嵌入服务器。",
  "settings.localEmbeddingBaseUrl.placeholder": "例如：http://localhost:11434",
  "settings.localEmbeddingApiKey": "嵌入 API 密钥",
  "settings.localEmbeddingApiKey.desc": "嵌入服务器的 API 密钥（可选）",
  "settings.localEmbeddingApiKey.placeholder": "输入嵌入 API 密钥",
  "settings.searchFileExtensions": "搜索文件扩展名",
  "settings.searchFileExtensions.desc": "用逗号分隔要包含在搜索结果中的文件扩展名（空 = 全部）。例如：md, pdf",
  "settings.searchFileExtensions.placeholder": "md, pdf",

  // Settings - Sync

  // Settings - RAG Files Modal

  // Common buttons
  "common.ok": "确定",
  "common.error": "错误：",

  // RAG Setting Name Modal
  "modal.nameCannotBeEmpty": "名称不能为空",
  "modal.name": "名称",
  "modal.enterName": "输入名称",

  // Chat
  "chat.savedAsNote": "已保存到 {{path}}",
  "chat.chatDeleted": "聊天已删除",
  "chat.configGeminiCli": "Antigravity CLI",
  "chat.configGeminiCliDesc": "启用 CLI 模式并验证 Antigravity CLI 是否正常工作",
  "chat.configClaudeCli": "Claude CLI",
  "chat.configClaudeCliDesc": "启用 CLI 模式并验证 Claude CLI 是否正常工作",
  "chat.configLocalLlm": "本地 LLM",
  "chat.configLocalLlmDesc": "连接本地 LLM 服务器（Ollama、LM Studio 等）",
  "chat.rateLimitPaid": "此模型可能已达到速率限制。请尝试使用其他模型直到明天。",
  "chat.errorOccurred": "抱歉，发生错误：{{message}}",
  "chat.unknownError": "未知错误",
  "chat.localLlmNotConfigured": "所选的本地 LLM 条目未配置。请选择其他模型或在设置中添加一个。",
  "chat.compactNotAvailable": "CLI 模式下无法使用压缩功能",
  "chat.yesterday": "昨天",

  // InputArea
  "input.ragPdfChunkPages": "PDF分块页数",
  "input.thinkingLabel": "始终思考",

  // MessageBubble
  // Diff viewer
  "diff.restoreSize": "恢复大小",

  // Tool display labels

  // Workflow Panel - Node Types

  // Workflow Panel - UI Strings

  // Common - Edit

  // Edit Confirmation Modal

  // Value Prompt Modal

  // Dialog Prompt Modal (titles passed dynamically)

  // Edit History

  // Workflow Modals

  // Edit History Modal
  "editHistoryModal.confirmClearWithRemote": "恢复到远程状态并清除历史？",

  // Diff Modal

  // Edit History Buttons
  "editHistoryModal.showRemote": "显示远程",
  "editHistoryModal.loadingRemote": "加载中...",
  "editHistoryModal.originLocal": "本地",
  "editHistoryModal.originRemote": "远程",

  // Status bar

  // Commands

  // Workflow Selector Modal

  // Errors

  // Encryption
  "settings.encryption": "加密",
  "settings.encryptChatHistory": "加密 AI 聊天历史",
  "settings.encryptChatHistory.desc": "加密 AI 聊天历史文件。查看内容需要密码。",
  "settings.encryptWorkflowHistory": "加密工作流执行日志",
  "settings.encryptWorkflowHistory.desc": "加密工作流执行日志文件。查看内容需要密码。",
  "settings.encryptionSetup": "设置加密",
  "settings.encryptionSetup.desc": "生成加密密钥。无需密码即可加密，但需要密码才能解密。",
  "settings.encryptionSetupBtn": "设置加密密钥",
  "settings.encryptionPassword": "加密密码",
  "settings.encryptionPassword.desc": "用于保护私钥的密码。解密时需要。",
  "settings.encryptionPassword.placeholder": "输入密码",
  "settings.encryptionConfirmPassword": "确认密码",
  "settings.encryptionConfirmPassword.placeholder": "确认密码",
  "settings.encryptionPasswordMismatch": "密码不匹配",
  "settings.encryptionSetupSuccess": "加密密钥已成功生成",
  "settings.encryptionSetupFailed": "加密设置失败：{{error}}",
  "settings.encryptionConfigured": "加密已配置",
  "settings.encryptionConfigured.desc": "加密密钥已设置。在下方选择要加密的日志类型。",
  "settings.encryptionResetKeys": "重置加密密钥",
  "settings.encryptionResetKeys.desc": "生成新的加密密钥。之前加密的聊天将无法读取。",
  "settings.encryptionResetKeysConfirm": "重置加密密钥？所有之前加密的聊天历史将无法读取。",
  "settings.encryptionKeysReset": "加密密钥已重置",

  // Decryption
  "chat.encryptedChat": "加密聊天",
  "chat.decryptFailed": "解密失败。请检查您的密码。",
  "chat.decrypted": "解密成功",

  // Workflow Generation Modal
  "workflow.generation.generatingWithCli": "使用{{cli}}生成中",

  // Workflow Preview Modal

  // Workflow Confirm Modal

  // Execution History Select Modal

  // Workflow Execution Modal

  // CryptView - File Encryption

  // MCP Server Settings
  "settings.mcpTransport": "传输方式",
  "settings.mcpTransport.http": "HTTP (Streamable HTTP)",
  "settings.mcpTransport.stdio": "Stdio (本地进程)",
  "settings.mcpTransport.stdioDesktopOnly": "Stdio 传输仅在桌面端可用",
  "settings.mcpServerCommand": "命令",
  "settings.mcpServerCommand.placeholder": "npx、uvx 或 /path/to/server",
  "settings.mcpServerArgs": "参数",
  "settings.mcpServerArgs.placeholder": "-y @modelcontextprotocol/server-name",
  "settings.mcpServerFraming": "帧协议",
  "settings.mcpServerFraming.contentLength": "Content-Length (TypeScript/npx 服务器)",
  "settings.mcpServerFraming.newline": "换行分隔 (Python/uvx 服务器)",
  "settings.mcpServerEnv": "环境变量 (JSON)",
  "settings.mcpServerEnv.placeholder": "{\"API_KEY\": \"xxx\"}",
  "settings.mcpServerEnv.desc": "服务器进程的可选环境变量（JSON 格式）",
  "settings.mcpServerCommandRequired": "Stdio 传输需要命令",
  "settings.mcpServerInvalidEnv": "环境变量的 JSON 格式无效",

  // Input - MCP tool hint

  // Skills Settings

  // Skills UI

  // HTML Preview Modal

  // AI Workflow Modal

  // Edit History Modal

  // Node Editor Modal

  // MCP Apps

  // Langfuse settings

  // Discord integration
  "settings.discord": "Discord 集成",
  "settings.discordEnabled": "启用 Discord 机器人",
  "settings.discordEnabled.desc": "在插件加载时启动 Discord 机器人",
  "settings.discordBotToken": "机器人令牌",
  "settings.discordBotToken.desc": "来自 Developer Portal (Bot → Token) 的 Discord 机器人令牌",
  "settings.discordBotToken.placeholder": "输入你的 Discord 机器人令牌",
  "settings.discordConnection": "连接",
  "settings.discordConnection.desc": "连接或断开 Discord 机器人",
  "settings.discordConnect": "连接",
  "settings.discordDisconnect": "断开连接",
  "settings.discordVerifying": "验证中...",
  "settings.discordStatusConnected": "机器人已连接",
  "settings.discordStatusDisconnected": "机器人未连接",
  "settings.discordDisconnected": "Discord 机器人已断开连接",
  "settings.discordVerifyFailed": "Discord 令牌验证失败：{{error}}",
  "settings.discordStartFailed": "Discord 机器人启动失败：{{error}}",
  "settings.discordRespondToDMs": "回复私信",
  "settings.discordRespondToDMs.desc": "机器人是否回复私信",
  "settings.discordRequireMention": "频道中需要 @mention",
  "settings.discordRequireMention.desc": "启用后，机器人仅在服务器频道中被提及时才回复",
  "settings.discordAllowedChannels": "允许的频道 ID",
  "settings.discordAllowedChannels.desc": "以逗号分隔的 Discord 频道 ID。留空以允许所有频道。",
  "settings.discordAllowedChannels.placeholder": "123456789,987654321",
  "settings.discordAllowedUsers": "允许的用户 ID",
  "settings.discordAllowedUsers.desc": "以逗号分隔的 Discord 用户 ID。留空以允许所有用户。",
  "settings.discordAllowedUsers.placeholder": "123456789,987654321",
  "settings.discordModel": "模型",
  "settings.discordModel.desc": "用于 Discord 回复的模型（例如 api:provider_id:model_name）。留空则使用当前选择的模型。",
  "settings.discordModel.placeholder": "使用当前模型",
  "settings.discordSystemPrompt": "系统提示词",
  "settings.discordSystemPrompt.desc": "Discord 回复使用的自定义系统提示词。留空则使用默认值。",
  "settings.discordSystemPrompt.placeholder": "你是 Discord 上的一位得力助手……",
  "settings.discordMaxResponseLength": "最大响应长度",
  "settings.discordMaxResponseLength.desc": "每条 Discord 消息的最大字符数（Discord 限制：2000）",

  // Search tab
  "search.discussWithSelected": "使用所选内容讨论",
  "search.pdfMode": "PDF 结果",
  "search.helpTitle": "参数帮助",
  "search.helpTopK": "Top K — 返回结果的最大数量。",
  "search.helpScoreThreshold": "最低分数 — 最低相似度分数（0.0–1.0）。低于此值的结果将被排除。",
  "search.helpExt": "Ext. — 用逗号分隔的文件扩展名过滤结果（如 md, pdf）。为空表示所有文件。",
  "search.helpChunkSize": "分块大小 — 索引时每个文本块的字符数。较大的块保留更多上下文，但可能降低精度。",
  "search.helpChunkOverlap": "分块重叠 — 相邻块之间的重叠字符数。有助于在块边界保留上下文。",
  "search.helpPdfChunkPages": "PDF 分块页数 — PDF 索引时合并为一个块的页数。",

  // RAG source modal

  // LLM vault tool folders
  "settings.cloudVaultToolAllowedFolders": "LLM 仓库工具文件夹",
  "settings.cloudVaultToolAllowedFolders.desc": "以逗号分隔的文件夹，LLM 仓库工具和由 LLM 触发的技能工作流可以访问这些文件夹。留空则允许访问整个仓库。这不会限制 RAG、手动附件、@note 提及、MCP 工具、脚本或 shell 命令。",
  "settings.cloudVaultToolAllowedFolders.placeholder": "示例：Public, Shared/Docs",

};
