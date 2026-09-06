// German translations
export const de: Record<string, string> = {
  // Settings - Headings
  "settings.cliProviders": "CLI-Anbieter",

  // Settings - API

  // Settings - CLI
  "settings.cliIntro": "Verifizieren Sie CLI-Anbieter, um sie als Modelle zu verwenden. Verifizierte Anbieter erscheinen in der Modellauswahl.",
  "settings.cliInstall": "Installieren: {{cmd}}",
  "settings.cliVerified": "Verifiziert",
  "settings.cliVerify": "Verifizieren",
  "settings.cliDisable": "Deaktivieren",
  "settings.cliVerifying": "Verifizierung...",
  "settings.cliVerifyingCli": "CLI wird verifiziert...",
  "settings.cliNotFound": "CLI nicht gefunden: ",
  "settings.cliLoginRequired": "Anmeldung erforderlich: ",
  "settings.cliRunGeminiLogin": "Führen Sie den Befehl 'agy' aus und schließen Sie die Anmeldung mit /auth ab",
  "settings.cliRunClaudeLogin": "Führen Sie den Befehl 'claude' aus und schließen Sie die Anmeldung ab",
  "settings.cliRunCodexLogin": "Führen Sie den Befehl 'codex' aus und schließen Sie die Anmeldung ab",
  "settings.geminiCliVerified": "Antigravity CLI verifiziert",
  "settings.claudeCliVerified": "Claude CLI verifiziert",
  "settings.codexCliVerified": "Codex CLI verifiziert",
  "settings.geminiCliDisabled": "Antigravity CLI deaktiviert",
  "settings.claudeCliDisabled": "Claude CLI deaktiviert",
  "settings.codexCliDisabled": "Codex CLI deaktiviert",
  "settings.cliPathSettings": "CLI-Pfad konfigurieren",
  "settings.cliPathModal.title": "CLI-Pfad-Einstellungen",
  "settings.cliPathModal.desc": "Wenn die CLI nicht automatisch erkannt wird, geben Sie hier den vollständigen Pfad an. Das Plugin durchsucht automatisch gängige Installationspfade, einschließlich Versions-Manager (nodenv, nvm, volta, fnm, asdf, mise).",
  "settings.cliPathModal.placeholder": "Pfad zur CLI-Ausführungsdatei oder zum Skript",
  "settings.cliPathModal.windowsNote": "Leave empty for auto-detection. To override Antigravity CLI, use the full path to agy.exe; Claude and Codex can use their standalone executable paths.",
  "settings.cliPathModal.unixNote": "Führen Sie im Terminal aus, um den Pfad zu finden:\nwhich agy (oder which claude / which codex)",
  "settings.cliPathModal.versionManagerNote": "Node.js Versions-Manager (nodenv, nvm, volta, fnm, asdf, mise) werden automatisch erkannt. Falls die Erkennung fehlschlägt, geben Sie den CLI-Skriptpfad direkt an (z.B. ~/.local/bin/agy).",
  "settings.cliPathModal.clear": "Löschen",
  "settings.cliPathModal.fileNotFound": "Datei nicht gefunden. Bitte überprüfen Sie den Pfad.",
  "settings.cliPathModal.invalidChars": "Pfad enthält ungültige Zeichen.",
  "settings.cliPathSaved": "CLI-Pfad gespeichert",
  "settings.cliPathCleared": "CLI-Pfad gelöscht",

  // Settings - Local LLM
  "settings.localLlm": "Lokales LLM",
  "settings.localLlmDesc": "Verbindung zu lokalen LLM-Servern (Ollama, LM Studio, vLLM, etc.)",
  "settings.localLlmAdd": "Lokales LLM hinzufügen",
  "settings.localLlmToolsDisabled": "Tools automatisch deaktiviert (Modell hat Function Calling abgelehnt)",
  "settings.localLlmToolsClear": "Tools wieder aktivieren",
  "settings.localLlmVerified": "Lokales LLM verifiziert",
  "settings.localLlmDisabled": "Lokales LLM deaktiviert",
  "settings.localLlmConfigure": "Lokales LLM konfigurieren",
  "settings.localLlmModal.title": "Lokale LLM-Konfiguration",
  "settings.localLlmModal.desc": "Konfigurieren Sie die Verbindung zu Ihrem lokalen LLM-Server.",
  "settings.localLlmModal.framework": "Framework",
  "settings.localLlmModal.frameworkDesc": "Wählen Sie Ihr LLM-Server-Framework",
  "settings.localLlmModal.baseUrl": "Basis-URL",
  "settings.localLlmModal.baseUrlDesc": "Server-Endpunkt-URL",
  "settings.localLlmModal.apiKey": "API-Schlüssel (optional)",
  "settings.localLlmModal.apiKeyDesc": "Nur für Dienste erforderlich, die eine Authentifizierung benötigen",
  "settings.localLlmModal.apiKeyDescAnythingllm": "Für AnythingLLM API-Zugang erforderlich",
  "settings.localLlmModal.apiKeyPlaceholder": "API-Schlüssel eingeben",
  "settings.localLlmModal.username": "Benutzername",
  "settings.localLlmModal.usernameDesc": "Optional. Wird als HTTP Basic Auth gesendet (entspricht OPENCODE_SERVER_USERNAME).",
  "settings.localLlmModal.usernamePlaceholder": "Benutzername",
  "settings.localLlmModal.password": "Passwort",
  "settings.localLlmModal.passwordDesc": "Optional. Wird als HTTP Basic Auth gesendet (entspricht OPENCODE_SERVER_PASSWORD).",
  "settings.localLlmModal.passwordPlaceholder": "Passwort",
  "settings.localLlmModal.model": "Modell",
  "settings.localLlmModal.modelDesc": "Modelle vom Server abrufen, dann eines oder mehrere auswählen",
  "settings.localLlmModal.modelMultiDesc": "Jedes ausgewählte Modell wird zu einem separaten Eintrag im Chat-Dropdown.",
  "settings.localLlmModal.modelRequired": "Wählen Sie mindestens ein Modell aus",
  "settings.localLlmModal.fetchModels": "Modelle abrufen",
  "settings.localLlmModal.fetching": "Wird abgerufen...",
  "settings.localLlmModal.modelsLoaded": "{{count}} Modelle geladen",
  "settings.localLlmModal.noModelsFound": "Keine Modelle gefunden",
  "settings.localLlmModal.temperature": "Temperatur",
  "settings.localLlmModal.temperatureDesc": "0.0-2.0 (leer = Server-Standard)",
  "settings.localLlmModal.maxTokens": "Max. Tokens",
  "settings.localLlmModal.maxTokensDesc": "Maximale Antwort-Tokens (leer = Server-Standard)",
  "settings.localLlmModal.serverDefault": "Server-Standard",
  "settings.localLlmModal.baseUrlRequired": "Basis-URL ist erforderlich",
  "settings.localLlmModal.fetchRequired": "Bitte zuerst Modelle abrufen",

  // Settings - API-Anbieter
  "settings.apiProviders": "API-Anbieter",
  "settings.apiProviders.desc": "Verbindung zu OpenAI-kompatiblen API-Anbietern herstellen (OpenAI, OpenRouter, Grok usw.)",
  "settings.apiProviderAdd": "Anbieter hinzufügen",
  "settings.apiProviderEdit": "Anbieter bearbeiten",
  "settings.apiProviderDelete": "Anbieter löschen",
  "settings.apiProviderDisabled": "Deaktiviert",
  "settings.apiProviderConfigure": "API-Anbieter konfigurieren",
  "settings.apiProviderType": "Anbietertyp",
  "settings.apiProviderCustom": "Benutzerdefiniert",
  "settings.apiProviderName": "Anzeigename",
  "settings.apiProviderBaseUrl": "Basis-URL",
  "settings.apiProviderApiKey": "API-Schlüssel",
  "settings.proxy": "Proxy",
  "settings.proxyUrl": "Proxy-URL",
  "settings.proxyUrl.desc": "HTTP(S)-Proxy für Unternehmens-Gateways (z.B. http://proxy:8080)",
  "settings.proxyBypass": "Ausnahmeliste",
  "settings.proxyBypass.desc": "Kommagetrennte Hosts, die den Proxy umgehen (z.B. api.openai.com, localhost)",
  "settings.apiProviderModel": "Aktivierte Modelle",
  "settings.apiProviderModel.desc": "Wählen Sie die zu verwendenden Modelle aus. Klicken Sie auf Überprüfen, um verfügbare Modelle zu entdecken.",
  "settings.apiProviderModelFilter": "Modelle filtern...",
  "settings.apiProviderAvailableModels": "Verfügbare Modelle",
  "settings.apiProviderVerify": "Verbindung überprüfen",
  "settings.apiProviderVerified": "Überprüft: {{count}} Modelle gefunden",
  "settings.apiProviderVerifyFailed": "Überprüfung fehlgeschlagen: {{error}}",
  "settings.apiProviderNameRequired": "Anbietername ist erforderlich",
  "settings.apiProviderApiKeyRequired": "API-Schlüssel ist erforderlich",
  "settings.apiProviderVerifyRequired": "Bitte überprüfen Sie zuerst die Verbindung",
  "chat.noApiProvider": "Kein API-Anbieter konfiguriert. Bitte fügen Sie einen Anbieter in den Einstellungen hinzu und überprüfen Sie ihn.",

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
  "settings.localPdfChunkPages": "PDF-Seitenanzahl pro Chunk",
  "settings.localPdfChunkPages.desc": "Anzahl der PDF-Seiten pro Chunk (1-6)",
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
  "settings.localEmbeddingBaseUrl": "Embedding-API-Basis-URL",
  "settings.localEmbeddingBaseUrl.desc": "Benutzerdefinierte Embedding-API-Basis-URL (leer lassen für Gemini-Standard). Verwenden Sie es für Ollama, OpenAI oder andere OpenAI-kompatible Embedding-Server.",
  "settings.localEmbeddingBaseUrl.placeholder": "Z.B. http://localhost:11434",
  "settings.localEmbeddingApiKey": "Embedding-API-Schlüssel",
  "settings.localEmbeddingApiKey.desc": "API-Schlüssel für den Embedding-Server (optional)",
  "settings.localEmbeddingApiKey.placeholder": "Embedding-API-Schlüssel eingeben",
  "settings.searchFileExtensions": "Suchdateierweiterungen",
  "settings.searchFileExtensions.desc": "Kommagetrennte Dateierweiterungen für Suchergebnisse (leer = alle). Z.B., md, pdf",
  "settings.searchFileExtensions.placeholder": "md, pdf",

  // Settings - Sync

  // Settings - RAG Files Modal

  // Common buttons
  "common.ok": "OK",
  "common.error": "Fehler: ",

  // RAG Setting Name Modal
  "modal.nameCannotBeEmpty": "Name darf nicht leer sein",
  "modal.name": "Name",
  "modal.enterName": "Name eingeben",

  // Chat
  "chat.savedAsNote": "Gespeichert als {{path}}",
  "chat.chatDeleted": "Chat gelöscht",
  "chat.configGeminiCli": "Antigravity CLI",
  "chat.configGeminiCliDesc": "CLI-Modus aktivieren und Antigravity CLI-Funktion verifizieren",
  "chat.configClaudeCli": "Claude CLI",
  "chat.configClaudeCliDesc": "CLI-Modus aktivieren und Claude CLI-Funktion verifizieren",
  "chat.configLocalLlm": "Lokales LLM",
  "chat.configLocalLlmDesc": "Verbindung zu einem lokalen LLM-Server (Ollama, LM Studio, etc.)",
  "chat.rateLimitPaid": "Dieses Modell könnte ratenbegrenzt sein. Versuchen Sie bis morgen ein anderes Modell.",
  "chat.errorOccurred": "Entschuldigung, ein Fehler ist aufgetreten: {{message}}",
  "chat.unknownError": "Unbekannter Fehler",
  "chat.localLlmNotConfigured": "Der ausgewählte Local-LLM-Eintrag ist nicht konfiguriert. Wählen Sie ein anderes Modell oder fügen Sie eines in den Einstellungen hinzu.",
  "chat.compactNotAvailable": "Komprimierung ist im CLI-Modus nicht verfügbar",
  "chat.yesterday": "Gestern",

  // InputArea
  "input.ragPdfChunkPages": "PDF-Seitenanzahl pro Chunk",
  "input.thinkingLabel": "Immer Denken",

  // MessageBubble
  // Diff viewer
  "diff.restoreSize": "Größe wiederherstellen",

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
  "editHistoryModal.confirmClearWithRemote": "Zum Remote-Zustand wiederherstellen und Verlauf löschen?",

  // Diff Modal

  // Edit History Buttons
  "editHistoryModal.showRemote": "Remote anzeigen",
  "editHistoryModal.loadingRemote": "Laden...",
  "editHistoryModal.originLocal": "Lokal",
  "editHistoryModal.originRemote": "Remote",

  // Status bar

  // Commands

  // Workflow Selector Modal

  // Errors

  // Encryption
  "settings.encryption": "Verschlüsselung",
  "settings.encryptChatHistory": "KI-Chat-Verlauf verschlüsseln",
  "settings.encryptChatHistory.desc": "KI-Chat-Verlaufsdateien verschlüsseln. Passwort zum Anzeigen erforderlich.",
  "settings.encryptWorkflowHistory": "Workflow-Ausführungsprotokolle verschlüsseln",
  "settings.encryptWorkflowHistory.desc": "Workflow-Ausführungsprotokolldateien verschlüsseln. Passwort zum Anzeigen erforderlich.",
  "settings.encryptionSetup": "Verschlüsselung einrichten",
  "settings.encryptionSetup.desc": "Verschlüsselungsschlüssel generieren. Verschlüsselung ohne Passwort möglich, aber Passwort zum Entschlüsseln nötig.",
  "settings.encryptionSetupBtn": "Verschlüsselungsschlüssel erstellen",
  "settings.encryptionPassword": "Verschlüsselungspasswort",
  "settings.encryptionPassword.desc": "Passwort zum Schutz des privaten Schlüssels. Für die Entschlüsselung erforderlich.",
  "settings.encryptionPassword.placeholder": "Passwort eingeben",
  "settings.encryptionConfirmPassword": "Passwort bestätigen",
  "settings.encryptionConfirmPassword.placeholder": "Passwort bestätigen",
  "settings.encryptionPasswordMismatch": "Passwörter stimmen nicht überein",
  "settings.encryptionSetupSuccess": "Verschlüsselungsschlüssel erfolgreich erstellt",
  "settings.encryptionSetupFailed": "Verschlüsselung einrichten fehlgeschlagen: {{error}}",
  "settings.encryptionConfigured": "Verschlüsselung konfiguriert",
  "settings.encryptionConfigured.desc": "Verschlüsselungsschlüssel sind eingerichtet. Wählen Sie unten, welche Protokolle verschlüsselt werden sollen.",
  "settings.encryptionResetKeys": "Verschlüsselungsschlüssel zurücksetzen",
  "settings.encryptionResetKeys.desc": "Neue Verschlüsselungsschlüssel generieren. Zuvor verschlüsselte Chats werden nicht mehr lesbar sein.",
  "settings.encryptionResetKeysConfirm": "Verschlüsselungsschlüssel zurücksetzen? Alle zuvor verschlüsselten Chat-Verläufe werden unlesbar.",
  "settings.encryptionKeysReset": "Verschlüsselungsschlüssel wurden zurückgesetzt",

  // Decryption
  "chat.encryptedChat": "Verschlüsselter Chat",
  "chat.decryptFailed": "Entschlüsselung fehlgeschlagen. Überprüfen Sie Ihr Passwort.",
  "chat.decrypted": "Erfolgreich entschlüsselt",

  // Workflow Generation Modal
  "workflow.generation.generatingWithCli": "Generieren mit {{cli}}",

  // Workflow Preview Modal

  // Workflow Confirm Modal

  // Execution History Select Modal

  // Workflow Execution Modal

  // CryptView - File Encryption

  // MCP Server Settings
  "settings.mcpTransport": "Transport",
  "settings.mcpTransport.http": "HTTP (Streamable HTTP)",
  "settings.mcpTransport.stdio": "Stdio (lokaler Prozess)",
  "settings.mcpTransport.stdioDesktopOnly": "Stdio-Transport ist nur auf dem Desktop verfügbar",
  "settings.mcpServerCommand": "Befehl",
  "settings.mcpServerCommand.placeholder": "npx, uvx oder /pfad/zum/server",
  "settings.mcpServerArgs": "Argumente",
  "settings.mcpServerArgs.placeholder": "-y @modelcontextprotocol/server-name",
  "settings.mcpServerFraming": "Framing-Protokoll",
  "settings.mcpServerFraming.contentLength": "Content-Length (TypeScript/npx-Server)",
  "settings.mcpServerFraming.newline": "Zeilenumbruch-getrennt (Python/uvx-Server)",
  "settings.mcpServerEnv": "Umgebungsvariablen (JSON)",
  "settings.mcpServerEnv.placeholder": "{\"API_KEY\": \"xxx\"}",
  "settings.mcpServerEnv.desc": "Optionale Umgebungsvariablen für den Serverprozess (JSON-Format)",
  "settings.mcpServerCommandRequired": "Befehl ist für Stdio-Transport erforderlich",
  "settings.mcpServerInvalidEnv": "Ungültiges JSON für Umgebungsvariablen",

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
  "settings.discord": "Discord-Integration",
  "settings.discordEnabled": "Discord-Bot aktivieren",
  "settings.discordEnabled.desc": "Discord-Bot beim Laden des Plugins starten",
  "settings.discordBotToken": "Bot-Token",
  "settings.discordBotToken.desc": "Discord-Bot-Token aus dem Developer Portal (Bot → Token)",
  "settings.discordBotToken.placeholder": "Discord-Bot-Token eingeben",
  "settings.discordConnection": "Verbindung",
  "settings.discordConnection.desc": "Discord-Bot verbinden oder trennen",
  "settings.discordConnect": "Verbinden",
  "settings.discordDisconnect": "Trennen",
  "settings.discordVerifying": "Überprüfe...",
  "settings.discordStatusConnected": "Bot ist verbunden",
  "settings.discordStatusDisconnected": "Bot ist nicht verbunden",
  "settings.discordDisconnected": "Discord-Bot getrennt",
  "settings.discordVerifyFailed": "Discord-Token-Verifizierung fehlgeschlagen: {{error}}",
  "settings.discordStartFailed": "Discord-Bot konnte nicht gestartet werden: {{error}}",
  "settings.discordRespondToDMs": "Auf DMs antworten",
  "settings.discordRespondToDMs.desc": "Ob der Bot auf Direktnachrichten antwortet",
  "settings.discordRequireMention": "@mention in Kanälen erforderlich",
  "settings.discordRequireMention.desc": "Wenn aktiviert, antwortet der Bot in Server-Kanälen nur bei Erwähnung",
  "settings.discordAllowedChannels": "Erlaubte Kanal-IDs",
  "settings.discordAllowedChannels.desc": "Kommagetrennte Discord-Kanal-IDs. Leer lassen, um alle Kanäle zuzulassen.",
  "settings.discordAllowedChannels.placeholder": "123456789,987654321",
  "settings.discordAllowedUsers": "Erlaubte Benutzer-IDs",
  "settings.discordAllowedUsers.desc": "Kommagetrennte Discord-Benutzer-IDs. Leer lassen, um alle Benutzer zuzulassen.",
  "settings.discordAllowedUsers.placeholder": "123456789,987654321",
  "settings.discordModel": "Modell",
  "settings.discordModel.desc": "Modell für Discord-Antworten (z. B. api:provider_id:model_name). Leer lassen, um das aktuell ausgewählte Modell zu verwenden.",
  "settings.discordModel.placeholder": "Aktuelles Modell verwenden",
  "settings.discordSystemPrompt": "System-Prompt",
  "settings.discordSystemPrompt.desc": "Benutzerdefinierter System-Prompt für Discord-Antworten. Leer lassen, um den Standard zu verwenden.",
  "settings.discordSystemPrompt.placeholder": "Du bist ein hilfreicher Assistent auf Discord...",
  "settings.discordMaxResponseLength": "Maximale Antwortlänge",
  "settings.discordMaxResponseLength.desc": "Maximale Zeichen pro Discord-Nachricht (Discord-Limit: 2000)",

  // Search tab
  "search.discussWithSelected": "Mit Auswahl diskutieren",
  "search.pdfMode": "PDF-Ergebnisse",
  "search.helpTitle": "Parameterhilfe",
  "search.helpTopK": "Top K — Maximale Anzahl der zurückgegebenen Ergebnisse.",
  "search.helpScoreThreshold": "Mindestpunktzahl — Minimale Ähnlichkeitspunktzahl (0,0–1,0). Ergebnisse unterhalb werden ausgeschlossen.",
  "search.helpExt": "Ext. — Kommagetrennte Dateierweiterungen zum Filtern (z.B. md, pdf). Leer = alle Dateien.",
  "search.helpChunkSize": "Chunk-Größe — Zeichenanzahl pro Textchunk bei der Indexierung. Größere Chunks behalten mehr Kontext, können aber die Präzision verringern.",
  "search.helpChunkOverlap": "Chunk-Überlappung — Anzahl überlappender Zeichen zwischen benachbarten Chunks. Hilft, Kontext an Chunk-Grenzen zu bewahren.",
  "search.helpPdfChunkPages": "PDF-Chunk-Seiten — Anzahl der Seiten, die bei der PDF-Indexierung zu einem Chunk zusammengefasst werden.",

  // RAG source modal

  // LLM vault tool folders
  "settings.cloudVaultToolAllowedFolders": "LLM-Vault-Tool-Ordner",
  "settings.cloudVaultToolAllowedFolders.desc": "Durch Kommas getrennte Ordner, auf die LLM-Vault-Tools und LLM-ausgelöste Skill-Workflows zugreifen dürfen. Leer lassen, um den gesamten Vault zu erlauben. Dies beschränkt nicht RAG, manuelle Anhänge, @note-Erwähnungen, MCP-Tools, Skripte oder Shell-Befehle.",
  "settings.cloudVaultToolAllowedFolders.placeholder": "Beispiel: Public, Shared/Docs",

};
