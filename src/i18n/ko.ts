// Korean translations
export const ko: Record<string, string> = {
  // Settings - Headings
  "settings.cliProviders": "CLI 제공자",

  // Settings - API

  // Settings - CLI
  "settings.cliIntro": "CLI 제공자를 확인하여 모델로 사용하세요. 확인된 제공자는 모델 선택에 표시됩니다.",
  "settings.cliInstall": "설치: {{cmd}}",
  "settings.cliVerified": "확인됨",
  "settings.cliVerify": "확인",
  "settings.cliDisable": "비활성화",
  "settings.cliVerifying": "확인 중...",
  "settings.cliVerifyingCli": "CLI 확인 중...",
  "settings.cliNotFound": "CLI를 찾을 수 없음: ",
  "settings.cliLoginRequired": "로그인 필요: ",
  "settings.cliRunGeminiLogin": "'agy' 명령을 실행하고 /auth로 로그인을 완료하세요",
  "settings.cliRunClaudeLogin": "'claude' 명령을 실행하고 로그인을 완료하세요",
  "settings.cliRunCodexLogin": "'codex' 명령을 실행하고 로그인을 완료하세요",
  "settings.geminiCliVerified": "Antigravity CLI 확인됨",
  "settings.claudeCliVerified": "Claude CLI 확인됨",
  "settings.codexCliVerified": "Codex CLI 확인됨",
  "settings.geminiCliDisabled": "Antigravity CLI 비활성화됨",
  "settings.claudeCliDisabled": "Claude CLI 비활성화됨",
  "settings.codexCliDisabled": "Codex CLI 비활성화됨",
  "settings.cliPathSettings": "CLI 경로 설정",
  "settings.cliPathModal.title": "CLI 경로 설정",
  "settings.cliPathModal.desc": "CLI가 자동으로 감지되지 않는 경우, 여기에 전체 경로를 지정하세요. 플러그인은 버전 관리자(nodenv, nvm, volta, fnm, asdf, mise)를 포함한 일반적인 설치 경로를 자동으로 검색합니다.",
  "settings.cliPathModal.placeholder": "CLI 실행 파일 또는 스크립트 경로",
  "settings.cliPathModal.windowsNote": "Leave empty for auto-detection. To override Antigravity CLI, use the full path to agy.exe; Claude and Codex can use their standalone executable paths.",
  "settings.cliPathModal.unixNote": "터미널에서 다음을 실행하여 경로 확인:\nwhich agy (또는 which claude / which codex)",
  "settings.cliPathModal.versionManagerNote": "Node.js 버전 관리자(nodenv, nvm, volta, fnm, asdf, mise)는 자동으로 감지됩니다. 감지에 실패하면 CLI 스크립트 경로를 직접 지정하세요 (예: ~/.local/bin/agy).",
  "settings.cliPathModal.clear": "지우기",
  "settings.cliPathModal.fileNotFound": "파일을 찾을 수 없습니다. 경로를 확인해 주세요.",
  "settings.cliPathModal.invalidChars": "경로에 잘못된 문자가 포함되어 있습니다.",
  "settings.cliPathSaved": "CLI 경로가 저장되었습니다",
  "settings.cliPathCleared": "CLI 경로가 지워졌습니다",

  // Settings - Local LLM
  "settings.localLlm": "로컬 LLM",
  "settings.localLlmDesc": "로컬 LLM 서버에 연결 (Ollama, LM Studio, vLLM 등)",
  "settings.localLlmAdd": "로컬 LLM 추가",
  "settings.localLlmToolsDisabled": "도구가 자동으로 비활성화됨 (모델이 함수 호출을 거부함)",
  "settings.localLlmToolsClear": "도구 다시 활성화",
  "settings.localLlmVerified": "로컬 LLM 확인됨",
  "settings.localLlmDisabled": "로컬 LLM 비활성화됨",
  "settings.localLlmConfigure": "로컬 LLM 설정",
  "settings.localLlmModal.title": "로컬 LLM 설정",
  "settings.localLlmModal.desc": "로컬 LLM 서버 연결을 설정합니다.",
  "settings.localLlmModal.framework": "프레임워크",
  "settings.localLlmModal.frameworkDesc": "LLM 서버 프레임워크 선택",
  "settings.localLlmModal.baseUrl": "기본 URL",
  "settings.localLlmModal.baseUrlDesc": "서버 엔드포인트 URL",
  "settings.localLlmModal.apiKey": "API 키 (선택사항)",
  "settings.localLlmModal.apiKeyDesc": "인증이 필요한 서비스에만 필요",
  "settings.localLlmModal.apiKeyDescAnythingllm": "AnythingLLM API 접근에 필요",
  "settings.localLlmModal.apiKeyPlaceholder": "API 키 입력",
  "settings.localLlmModal.username": "사용자 이름",
  "settings.localLlmModal.usernameDesc": "선택 사항. HTTP Basic 인증으로 전송됩니다 (OPENCODE_SERVER_USERNAME과 일치).",
  "settings.localLlmModal.usernamePlaceholder": "사용자 이름",
  "settings.localLlmModal.password": "비밀번호",
  "settings.localLlmModal.passwordDesc": "선택 사항. HTTP Basic 인증으로 전송됩니다 (OPENCODE_SERVER_PASSWORD과 일치).",
  "settings.localLlmModal.passwordPlaceholder": "비밀번호",
  "settings.localLlmModal.model": "모델",
  "settings.localLlmModal.modelDesc": "서버에서 모델을 가져온 후 하나 이상 선택",
  "settings.localLlmModal.modelMultiDesc": "체크한 각 모델이 채팅 드롭다운에 개별 항목으로 추가됩니다.",
  "settings.localLlmModal.modelRequired": "하나 이상의 모델을 선택하세요",
  "settings.localLlmModal.fetchModels": "모델 가져오기",
  "settings.localLlmModal.fetching": "가져오는 중...",
  "settings.localLlmModal.modelsLoaded": "{{count}}개의 모델 로드됨",
  "settings.localLlmModal.noModelsFound": "모델을 찾을 수 없음",
  "settings.localLlmModal.temperature": "온도",
  "settings.localLlmModal.temperatureDesc": "0.0-2.0 (비어있으면 서버 기본값)",
  "settings.localLlmModal.maxTokens": "최대 토큰",
  "settings.localLlmModal.maxTokensDesc": "최대 응답 토큰 (비어있으면 서버 기본값)",
  "settings.localLlmModal.serverDefault": "서버 기본값",
  "settings.localLlmModal.baseUrlRequired": "기본 URL은 필수입니다",
  "settings.localLlmModal.fetchRequired": "먼저 모델을 가져오세요",

  // Settings - API 제공자
  "settings.apiProviders": "API 제공자",
  "settings.apiProviders.desc": "OpenAI 호환 API 제공자에 연결 (OpenAI, OpenRouter, Grok 등)",
  "settings.apiProviderAdd": "제공자 추가",
  "settings.apiProviderEdit": "제공자 편집",
  "settings.apiProviderDelete": "제공자 삭제",
  "settings.apiProviderDisabled": "비활성화됨",
  "settings.apiProviderConfigure": "API 제공자 설정",
  "settings.apiProviderType": "제공자 유형",
  "settings.apiProviderCustom": "사용자 정의",
  "settings.apiProviderName": "표시 이름",
  "settings.apiProviderBaseUrl": "기본 URL",
  "settings.apiProviderApiKey": "API 키",
  "settings.proxy": "프록시",
  "settings.proxyUrl": "프록시 URL",
  "settings.proxyUrl.desc": "기업 게이트웨이용 HTTP(S) 프록시 (예: http://proxy:8080)",
  "settings.proxyBypass": "제외 목록",
  "settings.proxyBypass.desc": "프록시를 우회하는 호스트 (쉼표 구분, 예: api.openai.com, localhost)",
  "settings.apiProviderModel": "사용 모델",
  "settings.apiProviderModel.desc": "사용할 모델을 선택하세요. 확인을 클릭하여 사용 가능한 모델을 검색합니다.",
  "settings.apiProviderModelFilter": "모델 검색...",
  "settings.apiProviderAvailableModels": "사용 가능한 모델",
  "settings.apiProviderVerify": "연결 확인",
  "settings.apiProviderVerified": "확인됨: {{count}}개 모델 발견",
  "settings.apiProviderVerifyFailed": "확인 실패: {{error}}",
  "settings.apiProviderNameRequired": "제공자 이름은 필수입니다",
  "settings.apiProviderApiKeyRequired": "API 키는 필수입니다",
  "settings.apiProviderVerifyRequired": "먼저 연결을 확인해 주세요",
  "chat.noApiProvider": "API 제공자가 설정되지 않았습니다. 설정에서 제공자를 추가하고 확인하세요.",

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
  "settings.localPdfChunkPages": "PDF 청크 페이지 수",
  "settings.localPdfChunkPages.desc": "청크당 PDF 페이지 수 (1-6)",
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
  "settings.localEmbeddingBaseUrl": "임베딩 API 기본 URL",
  "settings.localEmbeddingBaseUrl.desc": "사용자 정의 임베딩 API 기본 URL (Gemini 기본값을 사용하려면 비워두세요). Ollama, OpenAI 또는 기타 OpenAI 호환 임베딩 서버에 사용합니다.",
  "settings.localEmbeddingBaseUrl.placeholder": "예: http://localhost:11434",
  "settings.localEmbeddingApiKey": "임베딩 API 키",
  "settings.localEmbeddingApiKey.desc": "임베딩 서버용 API 키 (선택사항)",
  "settings.localEmbeddingApiKey.placeholder": "임베딩 API 키 입력",
  "settings.searchFileExtensions": "검색 파일 확장자",
  "settings.searchFileExtensions.desc": "검색 결과에 포함할 파일 확장자를 쉼표로 구분 (비어 있으면 전체). 예: md, pdf",
  "settings.searchFileExtensions.placeholder": "md, pdf",

  // Settings - Sync

  // Settings - RAG Files Modal

  // Common buttons
  "common.ok": "확인",
  "common.error": "오류: ",

  // RAG Setting Name Modal
  "modal.nameCannotBeEmpty": "이름은 비워둘 수 없습니다",
  "modal.name": "이름",
  "modal.enterName": "이름 입력",

  // Chat
  "chat.savedAsNote": "{{path}}에 저장됨",
  "chat.chatDeleted": "채팅 삭제됨",
  "chat.configGeminiCli": "Antigravity CLI",
  "chat.configGeminiCliDesc": "CLI 모드를 활성화하고 Antigravity CLI가 작동하는지 확인하세요",
  "chat.configClaudeCli": "Claude CLI",
  "chat.configClaudeCliDesc": "CLI 모드를 활성화하고 Claude CLI가 작동하는지 확인하세요",
  "chat.configLocalLlm": "로컬 LLM",
  "chat.configLocalLlmDesc": "로컬 LLM 서버에 연결 (Ollama, LM Studio 등)",
  "chat.rateLimitPaid": "이 모델이 속도 제한될 수 있습니다. 내일까지 다른 모델을 시도하세요.",
  "chat.errorOccurred": "죄송합니다, 오류가 발생했습니다: {{message}}",
  "chat.unknownError": "알 수 없는 오류",
  "chat.localLlmNotConfigured": "선택한 로컬 LLM 항목이 구성되지 않았습니다. 다른 모델을 선택하거나 설정에서 추가하세요.",
  "chat.compactNotAvailable": "CLI 모드에서는 압축을 사용할 수 없습니다",
  "chat.yesterday": "어제",

  // InputArea
  "input.ragPdfChunkPages": "PDF 청크 페이지 수",
  "input.thinkingLabel": "항상 사고",

  // MessageBubble
  // Diff viewer
  "diff.restoreSize": "크기 복원",

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
  "editHistoryModal.confirmClearWithRemote": "원격 상태로 복원하고 기록을 지우시겠습니까?",

  // Diff Modal

  // Edit History Buttons
  "editHistoryModal.showRemote": "원격 보기",
  "editHistoryModal.loadingRemote": "로딩 중...",
  "editHistoryModal.originLocal": "로컬",
  "editHistoryModal.originRemote": "원격",

  // Status bar

  // Commands

  // Workflow Selector Modal

  // Errors

  // Encryption
  "settings.encryption": "암호화",
  "settings.encryptChatHistory": "AI 채팅 기록 암호화",
  "settings.encryptChatHistory.desc": "AI 채팅 기록 파일을 암호화합니다. 내용을 보려면 비밀번호가 필요합니다.",
  "settings.encryptWorkflowHistory": "워크플로우 실행 로그 암호화",
  "settings.encryptWorkflowHistory.desc": "워크플로우 실행 로그 파일을 암호화합니다. 내용을 보려면 비밀번호가 필요합니다.",
  "settings.encryptionSetup": "암호화 설정",
  "settings.encryptionSetup.desc": "암호화 키를 생성합니다. 비밀번호 없이 암호화할 수 있지만, 복호화하려면 비밀번호가 필요합니다.",
  "settings.encryptionSetupBtn": "암호화 키 생성",
  "settings.encryptionPassword": "암호화 비밀번호",
  "settings.encryptionPassword.desc": "개인 키를 보호하는 비밀번호입니다. 복호화에 필요합니다.",
  "settings.encryptionPassword.placeholder": "비밀번호 입력",
  "settings.encryptionConfirmPassword": "비밀번호 확인",
  "settings.encryptionConfirmPassword.placeholder": "비밀번호 확인",
  "settings.encryptionPasswordMismatch": "비밀번호가 일치하지 않습니다",
  "settings.encryptionSetupSuccess": "암호화 키가 성공적으로 생성되었습니다",
  "settings.encryptionSetupFailed": "암호화 설정 실패: {{error}}",
  "settings.encryptionConfigured": "암호화 구성됨",
  "settings.encryptionConfigured.desc": "암호화 키가 설정되었습니다. 아래에서 암호화할 로그를 선택하세요.",
  "settings.encryptionResetKeys": "암호화 키 재설정",
  "settings.encryptionResetKeys.desc": "새 암호화 키를 생성합니다. 이전에 암호화된 채팅은 읽을 수 없게 됩니다.",
  "settings.encryptionResetKeysConfirm": "암호화 키를 재설정하시겠습니까? 이전에 암호화된 모든 채팅 기록을 읽을 수 없게 됩니다.",
  "settings.encryptionKeysReset": "암호화 키가 재설정되었습니다",

  // Decryption
  "chat.encryptedChat": "암호화된 채팅",
  "chat.decryptFailed": "복호화 실패. 비밀번호를 확인하세요.",
  "chat.decrypted": "복호화 성공",

  // Workflow Generation Modal
  "workflow.generation.generatingWithCli": "{{cli}}로 생성 중",

  // Workflow Preview Modal

  // Workflow Confirm Modal

  // Execution History Select Modal

  // Workflow Execution Modal

  // CryptView - File Encryption

  // MCP Server Settings
  "settings.mcpTransport": "전송 방식",
  "settings.mcpTransport.http": "HTTP (Streamable HTTP)",
  "settings.mcpTransport.stdio": "Stdio (로컬 프로세스)",
  "settings.mcpTransport.stdioDesktopOnly": "Stdio 전송은 데스크톱에서만 사용 가능합니다",
  "settings.mcpServerCommand": "명령어",
  "settings.mcpServerCommand.placeholder": "npx, uvx 또는 /path/to/server",
  "settings.mcpServerArgs": "인수",
  "settings.mcpServerArgs.placeholder": "-y @modelcontextprotocol/server-name",
  "settings.mcpServerFraming": "프레이밍 프로토콜",
  "settings.mcpServerFraming.contentLength": "Content-Length (TypeScript/npx 서버)",
  "settings.mcpServerFraming.newline": "줄바꿈 구분 (Python/uvx 서버)",
  "settings.mcpServerEnv": "환경 변수 (JSON)",
  "settings.mcpServerEnv.placeholder": "{\"API_KEY\": \"xxx\"}",
  "settings.mcpServerEnv.desc": "서버 프로세스의 선택적 환경 변수 (JSON 형식)",
  "settings.mcpServerCommandRequired": "Stdio 전송에는 명령어가 필요합니다",
  "settings.mcpServerInvalidEnv": "환경 변수의 JSON 형식이 잘못되었습니다",

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
  "settings.discord": "Discord 통합",
  "settings.discordEnabled": "Discord 봇 활성화",
  "settings.discordEnabled.desc": "플러그인 로드 시 Discord 봇 시작",
  "settings.discordBotToken": "봇 토큰",
  "settings.discordBotToken.desc": "Developer Portal (Bot → Token)에서 발급받은 Discord 봇 토큰",
  "settings.discordBotToken.placeholder": "Discord 봇 토큰 입력",
  "settings.discordConnection": "연결",
  "settings.discordConnection.desc": "Discord 봇 연결 또는 연결 해제",
  "settings.discordConnect": "연결",
  "settings.discordDisconnect": "연결 해제",
  "settings.discordVerifying": "확인 중...",
  "settings.discordStatusConnected": "봇이 연결되었습니다",
  "settings.discordStatusDisconnected": "봇이 연결되지 않았습니다",
  "settings.discordDisconnected": "Discord 봇이 연결 해제되었습니다",
  "settings.discordVerifyFailed": "Discord 토큰 확인 실패: {{error}}",
  "settings.discordStartFailed": "Discord 봇 시작 실패: {{error}}",
  "settings.discordRespondToDMs": "DM에 응답",
  "settings.discordRespondToDMs.desc": "봇이 다이렉트 메시지에 응답할지 여부",
  "settings.discordRequireMention": "채널에서 @mention 필요",
  "settings.discordRequireMention.desc": "활성화 시 서버 채널에서 멘션된 경우에만 봇이 응답합니다",
  "settings.discordAllowedChannels": "허용된 채널 ID",
  "settings.discordAllowedChannels.desc": "쉼표로 구분된 Discord 채널 ID. 비워두면 모든 채널을 허용합니다.",
  "settings.discordAllowedChannels.placeholder": "123456789,987654321",
  "settings.discordAllowedUsers": "허용된 사용자 ID",
  "settings.discordAllowedUsers.desc": "쉼표로 구분된 Discord 사용자 ID. 비워두면 모든 사용자를 허용합니다.",
  "settings.discordAllowedUsers.placeholder": "123456789,987654321",
  "settings.discordModel": "모델",
  "settings.discordModel.desc": "Discord 응답에 사용할 모델 (예: api:provider_id:model_name). 비워두면 현재 선택된 모델을 사용합니다.",
  "settings.discordModel.placeholder": "현재 모델 사용",
  "settings.discordSystemPrompt": "시스템 프롬프트",
  "settings.discordSystemPrompt.desc": "Discord 응답용 커스텀 시스템 프롬프트. 비워두면 기본값을 사용합니다.",
  "settings.discordSystemPrompt.placeholder": "당신은 Discord의 유용한 어시스턴트입니다...",
  "settings.discordMaxResponseLength": "최대 응답 길이",
  "settings.discordMaxResponseLength.desc": "Discord 메시지당 최대 문자 수 (Discord 제한: 2000)",

  // Search tab
  "search.discussWithSelected": "선택 항목으로 토론",
  "search.pdfMode": "PDF 결과",
  "search.helpTitle": "매개변수 도움말",
  "search.helpTopK": "Top K — 반환할 최대 결과 수.",
  "search.helpScoreThreshold": "최소 점수 — 최소 유사도 점수 (0.0–1.0). 이 값 미만의 결과는 제외됩니다.",
  "search.helpExt": "Ext. — 결과를 필터링할 파일 확장자 (쉼표 구분, 예: md, pdf). 비어 있으면 모든 파일.",
  "search.helpChunkSize": "청크 크기 — 인덱싱 시 텍스트 청크당 문자 수. 클수록 더 많은 맥락을 유지하지만 정밀도가 떨어질 수 있습니다.",
  "search.helpChunkOverlap": "청크 오버랩 — 인접 청크 간 겹치는 문자 수. 청크 경계에서 맥락을 유지하는 데 도움이 됩니다.",
  "search.helpPdfChunkPages": "PDF 청크 페이지 — PDF 인덱싱 시 하나의 청크로 묶는 페이지 수.",

  // RAG source modal

  // LLM vault tool folders
  "settings.cloudVaultToolAllowedFolders": "LLM 보관소 도구 폴더",
  "settings.cloudVaultToolAllowedFolders.desc": "LLM 보관소 도구와 LLM이 트리거한 스킬 워크플로가 접근할 수 있는 폴더(쉼표로 구분). 비워 두면 보관소 전체를 허용합니다. 이는 RAG, 수동 첨부, @note 멘션, MCP 도구, 스크립트 또는 셸 명령을 제한하지 않습니다.",
  "settings.cloudVaultToolAllowedFolders.placeholder": "예: Public, Shared/Docs",

};
