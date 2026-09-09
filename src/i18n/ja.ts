// Japanese translations
export const ja: Record<string, string> = {
  // Settings - Credential storage
  "settings.credentialStorage": "認証情報の保存先",
  "settings.credentialStorage.mode": "APIキーの保存先",
  "settings.credentialStorage.plaintext": "プラグイン設定（平文）",
  "settings.credentialStorage.secretStorage": "Obsidianのシークレット領域",
  "settings.credentialStorage.plaintext.desc": "APIキー・トークン・パスワードをプラグイン設定ファイルとワークスペース状態ファイルに平文で保存します。vaultの同期対象に含まれるため、これらのファイルをGitへコミットしたり共有したりしないでください。",
  "settings.credentialStorage.secretStorage.desc": "APIキー・トークン・パスワードをObsidianのシークレット領域に保存し、vaultには書き込みません。シークレット領域は端末ごとに独立しているため、他の端末では各認証情報を入力し直す必要があります。",
  "settings.credentialStorage.unavailable": "シークレット領域の利用にはObsidian 1.11.4以降が必要です。",
  "settings.credentialStorage.configuredElsewhere": "別の端末で設定済みです。この端末で使うには入力し直してください。",
  "settings.credentialStorage.movedToSecretStorage": "認証情報をObsidianのシークレット領域へ移動しました。",
  "settings.credentialStorage.movedToPlaintext": "認証情報をプラグイン設定へ戻しました。",
  "settings.credentialStorage.switchFailed": "認証情報の保存先を切り替えられませんでした: {error}",
  "settings.credentialStorage.writeFailed": "Obsidianのシークレット領域へ書き込めませんでした。認証情報はプラグイン設定に平文のまま保持しています。",
  "settings.credentialStorage.workspaceMigrationFailed": "Obsidianのシークレット領域にあるワークスペースの認証情報を移行できませんでした。",
  // Settings - Headings
  "settings.cliProviders": "CLIプロバイダー",

  // Settings - API

  // Settings - CLI
  "settings.cliIntro": "CLIプロバイダーを検証してモデルとして使用します。検証済みのプロバイダーはモデル選択に表示されます。",
  "settings.cliInstall": "インストール: {{cmd}}",
  "settings.cliVerified": "検証済み",
  "settings.cliVerify": "検証",
  "settings.cliDisable": "無効化",
  "settings.cliVerifying": "検証中...",
  "settings.cliVerifyingCli": "CLIを検証中...",
  "settings.cliNotFound": "CLIが見つかりません: ",
  "settings.cliLoginRequired": "ログインが必要です: ",
  "settings.cliRunGeminiLogin": "'agy'コマンドを実行し、/authでログインを完了してください",
  "settings.cliRunClaudeLogin": "'claude'コマンドを実行してログインを完了してください",
  "settings.cliRunCodexLogin": "'codex'コマンドを実行してログインを完了してください",
  "settings.geminiCliVerified": "Antigravity CLIが検証されました",
  "settings.claudeCliVerified": "Claude CLIが検証されました",
  "settings.codexCliVerified": "Codex CLIが検証されました",
  "settings.geminiCliDisabled": "Antigravity CLIが無効化されました",
  "settings.claudeCliDisabled": "Claude CLIが無効化されました",
  "settings.codexCliDisabled": "Codex CLIが無効化されました",
  "settings.codexCliModel": "Codex CLIモデル",
  "settings.codexCliModel.desc": "インストール済みのCodex CLIが提供するモデル一覧から選択します。",
  "settings.codexCliModel.default": "Codex CLIのデフォルト",
  "settings.codexCliModel.loadFailed": "Codex CLIからモデル一覧を取得できませんでした。CLIのパスとバージョンを確認してください。",
  "settings.codexCliReasoningEffort": "Codexの推論レベル",
  "settings.codexCliReasoningEffort.desc": "Codexが使用する推論量を選択します。テキスト対話を高速化するため、デフォルトはlowです。",
  "settings.cliPathSettings": "CLIパスを設定",
  "settings.cliPathModal.title": "CLIパス設定",
  "settings.cliPathModal.desc": "CLIが自動検出されない場合、ここにフルパスを指定してください。プラグインはバージョンマネージャー（nodenv、nvm、volta、fnm、asdf、mise）を含む一般的なインストールパスを自動検索します。",
  "settings.cliPathModal.placeholder": "CLIの実行ファイルまたはスクリプトへのパス",
  "settings.cliPathModal.windowsNote": "Leave empty for auto-detection. To override Antigravity CLI, use the full path to agy.exe; Claude and Codex can use their standalone executable paths.",
  "settings.cliPathModal.unixNote": "ターミナルで以下を実行してパスを確認:\nwhich agy（または which claude / which codex）",
  "settings.cliPathModal.versionManagerNote": "Node.js バージョンマネージャー（nodenv、nvm、volta、fnm、asdf、mise）は自動検出されます。検出に失敗した場合は、CLIスクリプトのパスを直接指定してください（例: ~/.local/bin/agy）。",
  "settings.cliPathModal.clear": "クリア",
  "settings.cliPathModal.fileNotFound": "ファイルが見つかりません。パスを確認してください。",
  "settings.cliPathModal.invalidChars": "パスに無効な文字が含まれています。",
  "settings.cliPathSaved": "CLIパスを保存しました",
  "settings.cliPathCleared": "CLIパスをクリアしました",

  // Settings - Local LLM
  "settings.localLlm": "ローカルLLM",
  "settings.localLlmDesc": "ローカルLLMサーバーに接続（Ollama、LM Studio、vLLMなど）",
  "settings.localLlmAdd": "ローカルLLMを追加",
  "settings.localLlmToolsDisabled": "ツール自動無効（モデルが function calling を拒否）",
  "settings.localLlmToolsClear": "ツールを再有効化",
  "settings.localLlmVerified": "ローカルLLMが検証されました",
  "settings.localLlmDisabled": "ローカルLLMが無効化されました",
  "settings.localLlmConfigure": "ローカルLLMを設定",
  "settings.localLlmModal.title": "ローカルLLM設定",
  "settings.localLlmModal.desc": "ローカルLLMサーバーへの接続を設定します。",
  "settings.localLlmModal.framework": "フレームワーク",
  "settings.localLlmModal.frameworkDesc": "LLMサーバーのフレームワークを選択",
  "settings.localLlmModal.baseUrl": "ベースURL",
  "settings.localLlmModal.baseUrlDesc": "サーバーのエンドポイントURL",
  "settings.localLlmModal.apiKey": "APIキー（任意）",
  "settings.localLlmModal.apiKeyDesc": "認証が必要なサービスの場合のみ必要",
  "settings.localLlmModal.apiKeyDescAnythingllm": "AnythingLLM APIアクセスに必要",
  "settings.localLlmModal.apiKeyPlaceholder": "APIキーを入力",
  "settings.localLlmModal.username": "ユーザー名",
  "settings.localLlmModal.usernameDesc": "任意。HTTP Basic認証として送信（OPENCODE_SERVER_USERNAME と対応）。",
  "settings.localLlmModal.usernamePlaceholder": "ユーザー名",
  "settings.localLlmModal.password": "パスワード",
  "settings.localLlmModal.passwordDesc": "任意。HTTP Basic認証として送信（OPENCODE_SERVER_PASSWORD と対応）。",
  "settings.localLlmModal.passwordPlaceholder": "パスワード",
  "settings.localLlmModal.model": "モデル",
  "settings.localLlmModal.modelDesc": "サーバーからモデルを取得して、1 つ以上選択してください",
  "settings.localLlmModal.modelMultiDesc": "選択したモデルごとにチャットのドロップダウン項目になります。",
  "settings.localLlmModal.modelRequired": "1 つ以上のモデルを選択してください",
  "settings.localLlmModal.fetchModels": "モデル取得",
  "settings.localLlmModal.fetching": "取得中...",
  "settings.localLlmModal.modelsLoaded": "{{count}}個のモデルを読み込みました",
  "settings.localLlmModal.noModelsFound": "モデルが見つかりません",
  "settings.localLlmModal.temperature": "Temperature",
  "settings.localLlmModal.temperatureDesc": "0.0-2.0（空欄 = サーバーデフォルト）",
  "settings.localLlmModal.maxTokens": "最大トークン数",
  "settings.localLlmModal.maxTokensDesc": "レスポンスの最大トークン数（空欄 = サーバーデフォルト）",
  "settings.localLlmModal.streamIdleTimeout": "ストリーム待機タイムアウト（秒）",
  "settings.localLlmModal.streamIdleTimeoutDesc": "サーバーからストリームデータが届かない状態で待機する秒数。空欄の場合は120秒です。大きなプロンプトでは長めに設定してください。",
  "settings.localLlmModal.serverDefault": "サーバーデフォルト",
  "settings.localLlmModal.baseUrlRequired": "ベースURLは必須です",
  "settings.localLlmModal.fetchRequired": "先にモデルを取得してください",

  // Settings - API Providers
  "settings.apiProviders": "APIプロバイダー",
  "settings.apiProviders.desc": "OpenAI互換APIプロバイダーに接続（OpenAI、OpenRouter、Grokなど）",
  "settings.apiProviderAdd": "プロバイダーを追加",
  "settings.apiProviderEdit": "プロバイダーを編集",
  "settings.apiProviderDelete": "プロバイダーを削除",
  "settings.apiProviderDisabled": "無効",
  "settings.apiProviderConfigure": "APIプロバイダーを設定",
  "settings.apiProviderType": "プロバイダータイプ",
  "settings.apiProviderCustom": "カスタム",
  "settings.apiProviderName": "表示名",
  "settings.apiProviderBaseUrl": "ベースURL",
  "settings.apiProviderApiKey": "APIキー",
  "settings.proxy": "プロキシ",
  "settings.proxyUrl": "プロキシURL",
  "settings.proxyUrl.desc": "企業ゲートウェイ用HTTP(S)プロキシ（例：http://proxy:8080）",
  "settings.proxyBypass": "除外リスト",
  "settings.proxyBypass.desc": "プロキシを経由しないホスト（カンマ区切り、例：api.openai.com, localhost）",
  "settings.apiProviderModel": "使用モデル",
  "settings.apiProviderModel.desc": "使用するモデルを選択してください。「確認」をクリックして利用可能なモデルを検出できます。",
  "settings.pdfInputMode": "PDF入力モード",
  "settings.pdfInputMode.desc": "自動では公式Gemini、OpenAI、AnthropicはPDFを直接入力し、その他は抽出テキストを使用します。",
  "settings.pdfInputMode.localDesc": "自動ではPDFテキストを抽出します。ローカルサーバーとモデルがPDFファイル入力に対応する場合のみ直接入力を選択してください。",
  "settings.pdfInputMode.auto": "自動",
  "settings.pdfInputMode.native": "PDFを直接入力",
  "settings.pdfInputMode.extractText": "テキストを抽出",
  "settings.apiProviderModelFilter": "モデルを検索...",
  "settings.apiProviderAvailableModels": "利用可能なモデル",
  "settings.apiProviderVerify": "接続を確認",
  "settings.apiProviderVerified": "確認済み：{{count}}個のモデルが見つかりました",
  "settings.apiProviderVerifyFailed": "確認失敗：{{error}}",
  "settings.apiProviderNameRequired": "プロバイダー名は必須です",
  "settings.apiProviderApiKeyRequired": "APIキーは必須です",
  "settings.apiProviderVerifyRequired": "先に接続を確認してください",
  "chat.noApiProvider": "APIプロバイダーが設定されていません。設定でプロバイダーを追加して確認してください。",

  // Settings - Workspace

  // Settings - Tool limits
  "settings.cloudVaultToolAllowedFolders": "LLMのVault tool許可フォルダ",
  "settings.cloudVaultToolAllowedFolders.desc": "LLMのVault toolとLLMから起動されたskill workflowがアクセスできるフォルダをカンマ区切りで指定します。空の場合はVault全体を許可します。RAG、手動添付、@note mention、MCP tool、script、shell commandは制限しません。",
  "settings.cloudVaultToolAllowedFolders.placeholder": "例: Public, Shared/Docs",
  "settings.skills": "エージェントスキル",
  "settings.skillsFolder.desc": "エージェントスキルを保存するVault内の相対パス。変更しても既存フォルダは移動しません。フォルダアイコンは既定の skills フォルダにのみ表示されます。",
  "settings.skillsFolder.invalidPath": "絶対パスや \".\"、\"..\" のパス要素は使用できません。Vault内のフォルダを指定してください。",
  "settings.externalSkills": "外部スキル",
  "settings.externalSkillsRepository": "ソースリポジトリ",
  "settings.externalSkillsRepository.desc": "スキルは公式リポジトリ {{repo}} から取り込み、設定したスキルフォルダにコピーします。各スキルには manifest.json が必須です。",
  "settings.externalSkills.retry": "再試行",
  "settings.externalSkills.loading": "利用可能なスキルを読み込み中...",
  "settings.externalSkills.loadFailed": "スキルの読み込みに失敗しました: {{error}}",
  "settings.externalSkills.noSkills": "公式リポジトリに対応するスキルが見つかりませんでした。",
  "settings.externalSkills.allInstalled": "利用可能なスキルはすべてインストール済みです。",
  "settings.externalSkills.install": "スキルをインストール",
  "settings.externalSkills.install.desc": "公式リポジトリからスキルを選んでインストールします。",
  "settings.externalSkills.installButton": "インストール",
  "settings.externalSkills.installSkipped": "{{id}} をインストールできませんでした: {{reason}}",
  "settings.externalSkills.installed": "インストール済みスキル",
  "settings.externalSkills.noVersion": "バージョン情報なし",
  "settings.externalSkills.updateAvailable": "更新あり",
  "settings.externalSkills.check": "更新を確認",
  "settings.externalSkills.upToDate": "最新です (v{{version}})。",
  "settings.externalSkills.notInCatalog": "このスキルは公式リポジトリに存在しません。",
  "settings.externalSkills.updateConfirm": "{{name}} を v{{from}} から v{{to}} に更新しますか？",
  "settings.importSkills.done": "{{skills}}個のスキル、{{files}}個のファイルを取り込みました",
  "settings.importSkills.failed": "スキルの取り込みに失敗しました: {{error}}",

  // Settings - Slash commands

  // Settings - Slash command modal

  // Settings - RAG
  "settings.scoreThreshold": "スコア閾値",
  "settings.scoreThreshold.desc": "結果に含める最低類似度スコア (0.0-1.0)。0 = フィルタなし",

  // Settings - RAG Store
  "settings.localEmbeddingModel": "埋め込みモデル",
  "settings.localEmbeddingModel.desc": "埋め込み生成に使用するモデル",
  "settings.localChunkSize": "チャンクサイズ",
  "settings.localChunkSize.desc": "テキストチャンクあたりの文字数 (100-2000)",
  "settings.localChunkOverlap": "チャンクオーバーラップ",
  "settings.localChunkOverlap.desc": "チャンク間の重複文字数 (0-500)",
  "settings.localPdfChunkPages": "PDF分割ページ数",
  "settings.localPdfChunkPages.desc": "PDFを何ページ単位で分割するか (1-6)",
  "settings.indexMultimodal": "メディアファイルをインデックス",
  "settings.indexMultimodal.desc": "画像（PNG、JPEG）、音声（MP3、WAV）、動画（MP4）を意味検索の対象にします。Geminiのembeddingモデルが必要です。PDFはどのプロバイダでも対象になります。Geminiはページ自体を埋め込み、それ以外は抽出したテキストレイヤーを埋め込むため、テキストを持たないスキャンPDFはインデックスできません。",
  "settings.localSyncStatus": "ローカルインデックス: {{files}}ファイルから{{chunks}}チャンク",
  "settings.localSyncBtn": "ローカルインデックスを同期",
  "settings.localSyncing": "同期中...",
  "settings.localSyncResult": "ローカル同期: {{embedded}}埋め込み, {{skipped}}スキップ, {{removed}}削除",
  "settings.localSyncFilesFailed": "埋め込みに失敗したため {{count}}件を0チャンクとして登録しました:\n{{files}}",
  "settings.localClearIndex": "ローカルインデックスをクリア",
  "settings.localClearIndex.desc": "ローカル埋め込みインデックスとベクトルを削除します",
  "settings.localClearConfirm": "ローカル埋め込みインデックスをクリアしますか？ローカルRAGを使用するには再同期が必要です。",
  "settings.localIndexCleared": "ローカル埋め込みインデックスをクリアしました",
  "settings.ragMode.desc": "この設定でインデックスを作成するか、内部インデックスを結合するか、外部インデックスを読み込むかを選択します",
  "settings.ragMode.internal": "内部",
  "settings.ragMode.combined": "内部を結合",
  "settings.ragMode.external": "外部",
  "settings.ragSourceSettings.desc": "まとめて検索する内部RAG設定を選択します",
  "settings.ragSourceSettings.empty": "内部RAG設定がありません",
  "settings.externalIndex": "外部インデックスを使用",
  "settings.externalIndex.desc": "Vaultから同期する代わりにビルド済みインデックスを読み込む",
  "settings.externalIndexPath": "外部インデックスパス",
  "settings.externalIndexPath.desc": "ビルド済みの index.json と vectors.bin を含むディレクトリの絶対パス。1行に1パスで指定します。",
  "settings.externalIndexPath.placeholder": "例: /path/to/indexes/domain-1\n/path/to/indexes/domain-2",
  "settings.externalIndexSyncDisabled": "外部または結合インデックス設定では同期は無効です",
  "settings.externalEmbeddingBaseUrl.desc": "クエリ埋め込み生成用のサーバURL（空 = Gemini APIを使用）",
  "settings.externalIndexModel": "埋め込みモデル（インデックスから取得）",
  "settings.externalIndexModel.desc": "外部インデックスファイルから自動検出",
  "settings.externalIndexModel.loading": "読み込み中...",
  "settings.externalIndexModel.notFound": "未検出（インデックス未読み込み）",
  "settings.localApiKeyRequired": "ローカル埋め込みにはGoogle APIキーが必要です（Gemini Embedding APIに使用）",
  "settings.localSyncEmbedding": "埋め込み中",
  "settings.localSyncSkipping": "スキップ中",
  "settings.localSyncRemoving": "削除中",
  "settings.localEmbeddingBaseUrl": "埋め込みAPIベースURL",
  "settings.localEmbeddingBaseUrl.desc": "カスタム埋め込みAPIベースURL（Geminiデフォルトを使用する場合は空白のまま）。Ollama、OpenAI、またはその他のOpenAI互換埋め込みサーバーに使用します。",
  "settings.localEmbeddingBaseUrl.placeholder": "例：http://localhost:11434",
  "settings.localEmbeddingApiKey": "埋め込みAPIキー",
  "settings.localEmbeddingApiKey.desc": "埋め込みサーバー用APIキー（オプション）",
  "settings.localEmbeddingApiKey.placeholder": "埋め込みAPIキーを入力",
  "settings.searchFileExtensions": "検索対象ファイル拡張子",
  "settings.searchFileExtensions.desc": "検索結果に含めるファイル拡張子をカンマ区切りで指定（空 = 全て）。例：md, pdf",
  "settings.searchFileExtensions.placeholder": "md, pdf",

  // Settings - Sync

  // Settings - RAG Files Modal

  // Common buttons
  "common.ok": "OK",
  "common.error": "エラー: ",

  // RAG Setting Name Modal
  "modal.nameCannotBeEmpty": "名前を入力してください",
  "modal.name": "名前",
  "modal.enterName": "名前を入力",

  // Chat
  "chat.savedAsNote": "{{path}}に保存しました",
  "chat.chatDeleted": "チャットを削除しました",
  "chat.configGeminiCli": "Antigravity CLI",
  "chat.configGeminiCliDesc": "CLIモードを有効にしてAntigravity CLIが動作することを確認",
  "chat.configClaudeCli": "Claude CLI",
  "chat.configClaudeCliDesc": "CLIモードを有効にしてClaude CLIが動作することを確認",
  "chat.configLocalLlm": "ローカルLLM",
  "chat.configLocalLlmDesc": "ローカルLLMサーバー（Ollama、LM Studioなど）に接続",
  "chat.rateLimitPaid": "このモデルはレート制限されている可能性があります。明日まで別のモデルを試してください。",
  "chat.errorOccurred": "エラーが発生しました: {{message}}",
  "chat.unknownError": "不明なエラー",
  "chat.localLlmNotConfigured": "選択したローカル LLM は設定されていません。別のモデルを選ぶか、設定画面で追加してください。",
  "chat.compactNotAvailable": "CLIモードではコンパクトは使用できません",
  "chat.yesterday": "昨日",

  // InputArea
  "input.ragPdfChunkPages": "PDF分割ページ数",
  "input.thinkingLabel": "常に思考",

  // MessageBubble
  // Diff viewer
  "diff.restoreSize": "サイズを元に戻す",

  // Tool display labels
  "tool.ragSearched": "RAG検索",

  // Workflow Panel - Node Types

  // Workflow Panel - UI Strings

  // Common - Edit

  // Edit Confirmation Modal

  // Value Prompt Modal

  // Dialog Prompt Modal (titles passed dynamically)

  // Edit History

  // Workflow Modals

  // Edit History Modal
  "editHistoryModal.confirmClearWithRemote": "リモートの状態に復元して履歴をクリアしますか？",

  // Diff Modal

  // Edit History Buttons
  "editHistoryModal.showRemote": "リモート履歴を表示",
  "editHistoryModal.loadingRemote": "読み込み中...",
  "editHistoryModal.originLocal": "ローカル",
  "editHistoryModal.originRemote": "リモート",

  // Status bar

  // Commands

  // Workflow Selector Modal

  // Errors

  // Encryption
  "settings.encryption": "暗号化",
  "settings.encryptChatHistory": "AIチャット履歴を暗号化",
  "settings.encryptChatHistory.desc": "AIチャット履歴ファイルを暗号化します。内容を見るにはパスワードが必要です。",
  "settings.encryptWorkflowHistory": "ワークフロー実行ログを暗号化",
  "settings.encryptWorkflowHistory.desc": "ワークフロー実行ログファイルを暗号化します。内容を見るにはパスワードが必要です。",
  "settings.encryptionSetup": "暗号化の設定",
  "settings.encryptionSetup.desc": "暗号化鍵を生成します。暗号化はパスワード不要ですが、復号化にはパスワードが必要です。",
  "settings.encryptionSetupBtn": "暗号化鍵を生成",
  "settings.encryptionPassword": "暗号化パスワード",
  "settings.encryptionPassword.desc": "秘密鍵を保護するパスワード。復号化に必要です。",
  "settings.encryptionPassword.placeholder": "パスワードを入力",
  "settings.encryptionConfirmPassword": "パスワードを確認",
  "settings.encryptionConfirmPassword.placeholder": "パスワードを再入力",
  "settings.encryptionPasswordMismatch": "パスワードが一致しません",
  "settings.encryptionSetupSuccess": "暗号化鍵の生成に成功しました",
  "settings.encryptionSetupFailed": "暗号化の設定に失敗しました: {{error}}",
  "settings.encryptionConfigured": "暗号化が設定済み",
  "settings.encryptionConfigured.desc": "暗号化鍵が設定されています。以下で暗号化するログを選択してください。",
  "settings.encryptionResetKeys": "暗号化鍵をリセット",
  "settings.encryptionResetKeys.desc": "新しい暗号化鍵を生成します。以前の暗号化されたチャットは読めなくなります。",
  "settings.encryptionResetKeysConfirm": "暗号化鍵をリセットしますか？以前に暗号化されたチャット履歴は読めなくなります。",
  "settings.encryptionKeysReset": "暗号化鍵がリセットされました",

  // Decryption
  "chat.encryptedChat": "暗号化されたチャット",
  "chat.decryptFailed": "復号化に失敗しました。パスワードを確認してください。",
  "chat.decrypted": "復号化に成功しました",

  // Workflow Generation Modal
  "workflow.generation.generatingWithCli": "{{cli}}で生成中",

  // Workflow Preview Modal

  // Workflow Confirm Modal

  // Execution History Select Modal

  // Workflow Execution Modal

  // CryptView - File Encryption

  // Skills Settings

  // Skills UI

  // MCP Server Settings
  "settings.mcpTransport": "トランスポート",
  "settings.mcpTransport.http": "HTTP (Streamable HTTP)",
  "settings.mcpTransport.stdio": "Stdio (ローカルプロセス)",
  "settings.mcpTransport.stdioDesktopOnly": "Stdioトランスポートはデスクトップでのみ利用可能です",
  "settings.mcpServerCommand": "コマンド",
  "settings.mcpServerCommand.placeholder": "npx, uvx, または /path/to/server",
  "settings.mcpServerArgs": "引数",
  "settings.mcpServerArgs.placeholder": "-y @modelcontextprotocol/server-name",
  "settings.mcpServerFraming": "フレーミングプロトコル",
  "settings.mcpServerFraming.contentLength": "Content-Length (legacy/custom)",
  "settings.mcpServerFraming.newline": "改行区切り (標準MCP)",
  "settings.mcpServerEnv": "環境変数 (JSON)",
  "settings.mcpServerEnv.placeholder": "{\"API_KEY\": \"xxx\"}",
  "settings.mcpServerEnv.desc": "サーバープロセスの環境変数（JSON形式、任意）",
  "settings.mcpServerCommandRequired": "Stdioトランスポートにはコマンドが必要です",
  "settings.mcpServerInvalidEnv": "環境変数のJSONが無効です",

  // Input - MCP tool hint

  // HTML Preview Modal

  // AI Workflow Modal

  // Edit History Modal

  // Node Editor Modal

  // MCP Apps

  // Langfuse settings

  // Discord連携
  "settings.discord": "Discord連携",
  "settings.discordEnabled": "Discordボットを有効にする",
  "settings.discordEnabled.desc": "プラグイン読み込み時にDiscordボットを起動する",
  "settings.discordBotToken": "ボットトークン",
  "settings.discordBotToken.desc": "Discord Developer Portalからのボットトークン（Bot → Token）",
  "settings.discordBotToken.placeholder": "Discordボットトークンを入力",
  "settings.discordConnection": "接続",
  "settings.discordConnection.desc": "Discordボットの接続・切断",
  "settings.discordConnect": "接続",
  "settings.discordDisconnect": "切断",
  "settings.discordVerifying": "確認中...",
  "settings.discordStatusConnected": "ボットは接続中です",
  "settings.discordStatusDisconnected": "ボットは未接続です",
  "settings.discordDisconnected": "Discordボットを切断しました",
  "settings.discordVerifyFailed": "Discordトークンの確認に失敗しました: {{error}}",
  "settings.discordStartFailed": "Discordボットの起動に失敗しました: {{error}}",
  "settings.discordRespondToDMs": "DMに返信する",
  "settings.discordRespondToDMs.desc": "ボットがダイレクトメッセージに返信するかどうか",
  "settings.discordRequireMention": "チャンネルで@メンションを必須にする",
  "settings.discordRequireMention.desc": "有効にすると、サーバーチャンネルではメンションされた場合のみ返信します",
  "settings.discordAllowedChannels": "許可チャンネルID",
  "settings.discordAllowedChannels.desc": "カンマ区切りのDiscordチャンネルID。空の場合はすべてのチャンネルを許可します。",
  "settings.discordAllowedChannels.placeholder": "123456789,987654321",
  "settings.discordAllowedUsers": "許可ユーザーID",
  "settings.discordAllowedUsers.desc": "カンマ区切りのDiscordユーザーID。空の場合はすべてのユーザーを許可します。",
  "settings.discordAllowedUsers.placeholder": "123456789,987654321",
  "settings.discordModel": "モデル",
  "settings.discordModel.desc": "Discord応答に使用するモデル（例: api:provider_id:model_name）。空の場合は現在選択中のモデルを使用します。",
  "settings.discordModel.placeholder": "現在のモデルを使用",
  "settings.discordSystemPrompt": "システムプロンプト",
  "settings.discordSystemPrompt.desc": "Discord応答用のカスタムシステムプロンプト。空の場合はデフォルトを使用します。",
  "settings.discordSystemPrompt.placeholder": "あなたはDiscord上の便利なアシスタントです...",
  "settings.discordMaxResponseLength": "最大応答文字数",
  "settings.discordMaxResponseLength.desc": "Discordメッセージ1件あたりの最大文字数（Discord制限: 2000）",

  // Search tab
  "search.discussWithSelected": "選択してディスカッション",
  "search.pdfMode": "PDF結果",
  "search.helpTitle": "パラメータヘルプ",
  "search.helpTopK": "Top K — 返す結果の最大件数。",
  "search.helpScoreThreshold": "最低スコア — 類似度の最低スコア（0.0〜1.0）。この値未満の結果は除外されます。",
  "search.helpExt": "Ext. — 結果をフィルタするファイル拡張子（カンマ区切り、例：md, pdf）。空欄は全ファイル対象。",
  "search.helpChunkSize": "チャンクサイズ — インデックス作成時のテキストチャンクあたりの文字数。大きいほど文脈を保持しますが精度が下がる場合があります。",
  "search.helpChunkOverlap": "チャンクオーバーラップ — 隣接チャンク間の重複文字数。チャンク境界の文脈保持に役立ちます。",
  "search.helpPdfChunkPages": "PDFチャンクページ数 — PDFインデックス作成時に1チャンクにまとめるページ数。",

  // RAG source modal

};
