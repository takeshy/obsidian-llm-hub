// Italian translations
export const it: Record<string, string> = {
  // Settings - Headings
  "settings.cliProviders": "Provider CLI",

  // Settings - API

  // Settings - CLI
  "settings.cliIntro": "Verifica i provider CLI per usarli come modelli. I provider verificati appariranno nella selezione modelli.",
  "settings.cliInstall": "Installa: {{cmd}}",
  "settings.cliVerified": "Verificato",
  "settings.cliVerify": "Verifica",
  "settings.cliDisable": "Disabilita",
  "settings.cliVerifying": "Verifica in corso...",
  "settings.cliVerifyingCli": "Verifica CLI in corso...",
  "settings.cliNotFound": "CLI non trovato: ",
  "settings.cliLoginRequired": "Login richiesto: ",
  "settings.cliRunGeminiLogin": "Esegui il comando 'agy' e completa il login con /auth",
  "settings.cliRunClaudeLogin": "Esegui il comando 'claude' e completa il login",
  "settings.cliRunCodexLogin": "Esegui il comando 'codex' e completa il login",
  "settings.geminiCliVerified": "Antigravity CLI verificato",
  "settings.claudeCliVerified": "Claude CLI verificato",
  "settings.codexCliVerified": "Codex CLI verificato",
  "settings.geminiCliDisabled": "Antigravity CLI disabilitato",
  "settings.claudeCliDisabled": "Claude CLI disabilitato",
  "settings.codexCliDisabled": "Codex CLI disabilitato",
  "settings.cliPathSettings": "Configura percorso CLI",
  "settings.cliPathModal.title": "Impostazioni percorso CLI",
  "settings.cliPathModal.desc": "Se il CLI non viene rilevato automaticamente, specifica il percorso completo qui. Il plugin cerca automaticamente i percorsi di installazione comuni, inclusi i gestori di versioni (nodenv, nvm, volta, fnm, asdf, mise).",
  "settings.cliPathModal.placeholder": "Percorso all'eseguibile o script CLI",
  "settings.cliPathModal.windowsNote": "Leave empty for auto-detection. To override Antigravity CLI, use the full path to agy.exe; Claude and Codex can use their standalone executable paths.",
  "settings.cliPathModal.unixNote": "Esegui nel terminale per trovare il percorso:\nwhich agy (o which claude / which codex)",
  "settings.cliPathModal.versionManagerNote": "I gestori di versioni Node.js (nodenv, nvm, volta, fnm, asdf, mise) vengono rilevati automaticamente. Se il rilevamento fallisce, specifica direttamente il percorso dello script CLI (es. ~/.local/bin/agy).",
  "settings.cliPathModal.clear": "Cancella",
  "settings.cliPathModal.fileNotFound": "File non trovato. Verifica il percorso.",
  "settings.cliPathModal.invalidChars": "Il percorso contiene caratteri non validi.",
  "settings.cliPathSaved": "Percorso CLI salvato",
  "settings.cliPathCleared": "Percorso CLI cancellato",

  // Settings - Local LLM
  "settings.localLlm": "LLM locale",
  "settings.localLlmDesc": "Connetti a server LLM locali (Ollama, LM Studio, vLLM, ecc.)",
  "settings.localLlmAdd": "Aggiungi LLM locale",
  "settings.localLlmToolsDisabled": "Strumenti disattivati automaticamente (il modello ha rifiutato la chiamata di funzione)",
  "settings.localLlmToolsClear": "Riattiva strumenti",
  "settings.localLlmVerified": "LLM locale verificato",
  "settings.localLlmDisabled": "LLM locale disabilitato",
  "settings.localLlmConfigure": "Configura LLM locale",
  "settings.localLlmModal.title": "Configurazione LLM locale",
  "settings.localLlmModal.desc": "Configura la connessione al tuo server LLM locale.",
  "settings.localLlmModal.framework": "Framework",
  "settings.localLlmModal.frameworkDesc": "Seleziona il framework del tuo server LLM",
  "settings.localLlmModal.baseUrl": "URL base",
  "settings.localLlmModal.baseUrlDesc": "URL dell'endpoint del server",
  "settings.localLlmModal.apiKey": "Chiave API (opzionale)",
  "settings.localLlmModal.apiKeyDesc": "Richiesto solo per servizi che necessitano di autenticazione",
  "settings.localLlmModal.apiKeyDescAnythingllm": "Richiesto per l'accesso all'API di AnythingLLM",
  "settings.localLlmModal.apiKeyPlaceholder": "Inserisci la chiave API",
  "settings.localLlmModal.username": "Nome utente",
  "settings.localLlmModal.usernameDesc": "Opzionale. Inviato come HTTP Basic Auth (corrisponde a OPENCODE_SERVER_USERNAME).",
  "settings.localLlmModal.usernamePlaceholder": "nome utente",
  "settings.localLlmModal.password": "Password",
  "settings.localLlmModal.passwordDesc": "Opzionale. Inviato come HTTP Basic Auth (corrisponde a OPENCODE_SERVER_PASSWORD).",
  "settings.localLlmModal.passwordPlaceholder": "password",
  "settings.localLlmModal.model": "Modello",
  "settings.localLlmModal.modelDesc": "Recupera modelli dal server, poi selezionane uno o più",
  "settings.localLlmModal.modelMultiDesc": "Ogni modello selezionato diventa una voce separata nel menu a discesa della chat.",
  "settings.localLlmModal.modelRequired": "Seleziona almeno un modello",
  "settings.localLlmModal.fetchModels": "Recupera modelli",
  "settings.localLlmModal.fetching": "Recupero in corso...",
  "settings.localLlmModal.modelsLoaded": "{{count}} modelli caricati",
  "settings.localLlmModal.noModelsFound": "Nessun modello trovato",
  "settings.localLlmModal.temperature": "Temperatura",
  "settings.localLlmModal.temperatureDesc": "0.0-2.0 (vuoto = predefinito del server)",
  "settings.localLlmModal.maxTokens": "Token massimi",
  "settings.localLlmModal.maxTokensDesc": "Token massimi di risposta (vuoto = predefinito del server)",
  "settings.localLlmModal.serverDefault": "Predefinito del server",
  "settings.localLlmModal.baseUrlRequired": "L'URL base è obbligatorio",
  "settings.localLlmModal.fetchRequired": "Per favore, recupera prima i modelli",

  // Settings - Provider API
  "settings.apiProviders": "Provider API",
  "settings.apiProviders.desc": "Connettiti a provider API compatibili con OpenAI (OpenAI, OpenRouter, Grok, ecc.)",
  "settings.apiProviderAdd": "Aggiungi provider",
  "settings.apiProviderEdit": "Modifica provider",
  "settings.apiProviderDelete": "Elimina provider",
  "settings.apiProviderDisabled": "Disabilitato",
  "settings.apiProviderConfigure": "Configura provider API",
  "settings.apiProviderType": "Tipo di provider",
  "settings.apiProviderCustom": "Personalizzato",
  "settings.apiProviderName": "Nome visualizzato",
  "settings.apiProviderBaseUrl": "URL base",
  "settings.apiProviderApiKey": "Chiave API",
  "settings.proxy": "Proxy",
  "settings.proxyUrl": "URL proxy",
  "settings.proxyUrl.desc": "Proxy HTTP(S) per gateway aziendali (es. http://proxy:8080)",
  "settings.proxyBypass": "Lista esclusioni",
  "settings.proxyBypass.desc": "Host separati da virgola che bypassano il proxy (es. api.openai.com, localhost)",
  "settings.apiProviderModel": "Modelli abilitati",
  "settings.apiProviderModel.desc": "Seleziona i modelli da utilizzare. Clicca su Verifica per scoprire i modelli disponibili.",
  "settings.apiProviderModelFilter": "Filtra modelli...",
  "settings.apiProviderAvailableModels": "Modelli disponibili",
  "settings.apiProviderVerify": "Verifica connessione",
  "settings.apiProviderVerified": "Verificato: {{count}} modelli trovati",
  "settings.apiProviderVerifyFailed": "Verifica fallita: {{error}}",
  "settings.apiProviderNameRequired": "Il nome del provider è obbligatorio",
  "settings.apiProviderApiKeyRequired": "La chiave API è obbligatoria",
  "settings.apiProviderVerifyRequired": "Per favore, verifica prima la connessione",
  "chat.noApiProvider": "Nessun provider API configurato. Aggiungi e verifica un provider nelle impostazioni.",

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
  "settings.localPdfChunkPages": "Pagine PDF per frammento",
  "settings.localPdfChunkPages.desc": "Numero di pagine PDF per frammento (1-6)",
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
  "settings.localEmbeddingBaseUrl": "URL base API di embedding",
  "settings.localEmbeddingBaseUrl.desc": "URL base personalizzata per l'API di embedding (lasciare vuoto per il valore predefinito Gemini). Usare per Ollama, OpenAI o altri server di embedding compatibili con OpenAI.",
  "settings.localEmbeddingBaseUrl.placeholder": "Es. http://localhost:11434",
  "settings.localEmbeddingApiKey": "Chiave API di embedding",
  "settings.localEmbeddingApiKey.desc": "Chiave API per il server di embedding (opzionale)",
  "settings.localEmbeddingApiKey.placeholder": "Inserisci la chiave API di embedding",
  "settings.searchFileExtensions": "Estensioni file di ricerca",
  "settings.searchFileExtensions.desc": "Estensioni file separate da virgola da includere nei risultati (vuoto = tutte). Es., md, pdf",
  "settings.searchFileExtensions.placeholder": "md, pdf",

  // Settings - Sync

  // Settings - RAG Files Modal

  // Common buttons
  "common.ok": "OK",
  "common.error": "Errore: ",

  // RAG Setting Name Modal
  "modal.nameCannotBeEmpty": "Il nome non può essere vuoto",
  "modal.name": "Nome",
  "modal.enterName": "Inserisci nome",

  // Chat
  "chat.savedAsNote": "Salvato come {{path}}",
  "chat.chatDeleted": "Chat eliminata",
  "chat.configGeminiCli": "Antigravity CLI",
  "chat.configGeminiCliDesc": "Abilita modalità CLI e verifica che Antigravity CLI funzioni",
  "chat.configClaudeCli": "Claude CLI",
  "chat.configClaudeCliDesc": "Abilita modalità CLI e verifica che Claude CLI funzioni",
  "chat.configLocalLlm": "LLM locale",
  "chat.configLocalLlmDesc": "Connetti a un server LLM locale (Ollama, LM Studio, ecc.)",
  "chat.rateLimitPaid": "Questo modello potrebbe aver raggiunto il limite. Prova un altro modello fino a domani.",
  "chat.errorOccurred": "Spiacente, si è verificato un errore: {{message}}",
  "chat.unknownError": "Errore sconosciuto",
  "chat.localLlmNotConfigured": "La voce LLM locale selezionata non è configurata. Scegli un altro modello o aggiungine uno nelle impostazioni.",
  "chat.compactNotAvailable": "La compressione non è disponibile in modalità CLI",
  "chat.yesterday": "Ieri",

  // InputArea
  "input.ragPdfChunkPages": "Pagine PDF per frammento",
  "input.thinkingLabel": "Pensare sempre",

  // MessageBubble
  // Diff viewer
  "diff.restoreSize": "Ripristina dimensioni",

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
  "editHistoryModal.confirmClearWithRemote": "Ripristinare allo stato remoto e cancellare la cronologia?",

  // Diff Modal

  // Edit History Buttons
  "editHistoryModal.showRemote": "Mostra remoto",
  "editHistoryModal.loadingRemote": "Caricamento...",
  "editHistoryModal.originLocal": "Locale",
  "editHistoryModal.originRemote": "Remoto",

  // Status bar

  // Commands

  // Workflow Selector Modal

  // Errors

  // Encryption
  "settings.encryption": "Crittografia",
  "settings.encryptChatHistory": "Crittografa cronologia chat IA",
  "settings.encryptChatHistory.desc": "Crittografa i file della cronologia chat IA. Richiede la password per visualizzare il contenuto.",
  "settings.encryptWorkflowHistory": "Crittografa log di esecuzione workflow",
  "settings.encryptWorkflowHistory.desc": "Crittografa i file dei log di esecuzione workflow. Richiede la password per visualizzare il contenuto.",
  "settings.encryptionSetup": "Configura crittografia",
  "settings.encryptionSetup.desc": "Genera le chiavi di crittografia. Puoi crittografare senza password, ma la password è necessaria per decrittografare.",
  "settings.encryptionSetupBtn": "Configura chiavi di crittografia",
  "settings.encryptionPassword": "Password di crittografia",
  "settings.encryptionPassword.desc": "Password per proteggere la chiave privata. Necessaria per la decrittografia.",
  "settings.encryptionPassword.placeholder": "Inserisci password",
  "settings.encryptionConfirmPassword": "Conferma password",
  "settings.encryptionConfirmPassword.placeholder": "Conferma password",
  "settings.encryptionPasswordMismatch": "Le password non corrispondono",
  "settings.encryptionSetupSuccess": "Chiavi di crittografia generate con successo",
  "settings.encryptionSetupFailed": "Impossibile configurare la crittografia: {{error}}",
  "settings.encryptionConfigured": "Crittografia configurata",
  "settings.encryptionConfigured.desc": "Le chiavi di crittografia sono configurate. Scegli quali log crittografare di seguito.",
  "settings.encryptionResetKeys": "Reimposta chiavi di crittografia",
  "settings.encryptionResetKeys.desc": "Genera nuove chiavi di crittografia. Le chat crittografate in precedenza non saranno più leggibili.",
  "settings.encryptionResetKeysConfirm": "Reimpostare le chiavi di crittografia? Tutta la cronologia chat crittografata in precedenza diventerà illeggibile.",
  "settings.encryptionKeysReset": "Le chiavi di crittografia sono state reimpostate",

  // Decryption
  "chat.encryptedChat": "Chat crittografata",
  "chat.decryptFailed": "Decrittografia fallita. Verifica la password.",
  "chat.decrypted": "Decrittografato con successo",

  // Workflow Generation Modal
  "workflow.generation.generatingWithCli": "Generazione con {{cli}}",

  // Workflow Preview Modal

  // Workflow Confirm Modal

  // Execution History Select Modal

  // Workflow Execution Modal

  // CryptView - File Encryption

  // MCP Server Settings
  "settings.mcpTransport": "Trasporto",
  "settings.mcpTransport.http": "HTTP (Streamable HTTP)",
  "settings.mcpTransport.stdio": "Stdio (processo locale)",
  "settings.mcpTransport.stdioDesktopOnly": "Il trasporto Stdio è disponibile solo su desktop",
  "settings.mcpServerCommand": "Comando",
  "settings.mcpServerCommand.placeholder": "npx, uvx o /percorso/al/server",
  "settings.mcpServerArgs": "Argomenti",
  "settings.mcpServerArgs.placeholder": "-y @modelcontextprotocol/server-name",
  "settings.mcpServerFraming": "Protocollo di framing",
  "settings.mcpServerFraming.contentLength": "Content-Length (server TypeScript/npx)",
  "settings.mcpServerFraming.newline": "Delimitato da nuova riga (server Python/uvx)",
  "settings.mcpServerEnv": "Variabili d'ambiente (JSON)",
  "settings.mcpServerEnv.placeholder": "{\"API_KEY\": \"xxx\"}",
  "settings.mcpServerEnv.desc": "Variabili d'ambiente opzionali per il processo del server (formato JSON)",
  "settings.mcpServerCommandRequired": "Il comando è obbligatorio per il trasporto Stdio",
  "settings.mcpServerInvalidEnv": "JSON non valido per le variabili d'ambiente",

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
  "settings.discord": "Integrazione Discord",
  "settings.discordEnabled": "Abilita bot Discord",
  "settings.discordEnabled.desc": "Avvia il bot Discord al caricamento del plugin",
  "settings.discordBotToken": "Token del bot",
  "settings.discordBotToken.desc": "Token del bot Discord dal Developer Portal (Bot → Token)",
  "settings.discordBotToken.placeholder": "Inserisci il token del tuo bot Discord",
  "settings.discordConnection": "Connessione",
  "settings.discordConnection.desc": "Connetti o disconnetti il bot Discord",
  "settings.discordConnect": "Connetti",
  "settings.discordDisconnect": "Disconnetti",
  "settings.discordVerifying": "Verifica in corso...",
  "settings.discordStatusConnected": "Il bot è connesso",
  "settings.discordStatusDisconnected": "Il bot non è connesso",
  "settings.discordDisconnected": "Bot Discord disconnesso",
  "settings.discordVerifyFailed": "Verifica del token Discord fallita: {{error}}",
  "settings.discordStartFailed": "Avvio del bot Discord fallito: {{error}}",
  "settings.discordRespondToDMs": "Rispondi ai DM",
  "settings.discordRespondToDMs.desc": "Se il bot risponde ai messaggi diretti",
  "settings.discordRequireMention": "Richiedi @mention nei canali",
  "settings.discordRequireMention.desc": "Se abilitato, il bot risponde solo quando menzionato nei canali del server",
  "settings.discordAllowedChannels": "ID canali consentiti",
  "settings.discordAllowedChannels.desc": "ID canali Discord separati da virgola. Lascia vuoto per consentire tutti i canali.",
  "settings.discordAllowedChannels.placeholder": "123456789,987654321",
  "settings.discordAllowedUsers": "ID utenti consentiti",
  "settings.discordAllowedUsers.desc": "ID utenti Discord separati da virgola. Lascia vuoto per consentire tutti gli utenti.",
  "settings.discordAllowedUsers.placeholder": "123456789,987654321",
  "settings.discordModel": "Modello",
  "settings.discordModel.desc": "Modello da usare per le risposte Discord (es. api:provider_id:model_name). Lascia vuoto per usare il modello attualmente selezionato.",
  "settings.discordModel.placeholder": "Usa il modello attuale",
  "settings.discordSystemPrompt": "System prompt",
  "settings.discordSystemPrompt.desc": "System prompt personalizzato per le risposte Discord. Lascia vuoto per usare quello predefinito.",
  "settings.discordSystemPrompt.placeholder": "Sei un assistente utile su Discord...",
  "settings.discordMaxResponseLength": "Lunghezza massima della risposta",
  "settings.discordMaxResponseLength.desc": "Numero massimo di caratteri per messaggio Discord (limite Discord: 2000)",

  // Search tab
  "search.discussWithSelected": "Discuti con la selezione",
  "search.pdfMode": "Risultati PDF",
  "search.helpTitle": "Aiuto parametri",
  "search.helpTopK": "Top K — Numero massimo di risultati da restituire.",
  "search.helpScoreThreshold": "Punteggio minimo — Punteggio di similarità minimo (0.0–1.0). I risultati inferiori vengono esclusi.",
  "search.helpExt": "Ext. — Estensioni file separate da virgola per filtrare (es. md, pdf). Vuoto = tutti i file.",
  "search.helpChunkSize": "Dimensione chunk — Numero di caratteri per blocco di testo durante l'indicizzazione. Blocchi più grandi mantengono più contesto ma possono ridurre la precisione.",
  "search.helpChunkOverlap": "Sovrapposizione chunk — Numero di caratteri sovrapposti tra blocchi adiacenti. Aiuta a preservare il contesto ai confini.",
  "search.helpPdfChunkPages": "Pagine per chunk PDF — Numero di pagine raggruppate in un singolo blocco durante l'indicizzazione dei PDF.",

  // RAG source modal

  // LLM vault tool folders
  "settings.cloudVaultToolAllowedFolders": "Cartelle degli strumenti vault LLM",
  "settings.cloudVaultToolAllowedFolders.desc": "Cartelle separate da virgole a cui gli strumenti vault LLM e i workflow di skill attivati dall'LLM possono accedere. Lascia vuoto per consentire l'intero vault. Questo non limita RAG, gli allegati manuali, le menzioni @note, gli strumenti MCP, gli script o i comandi della shell.",
  "settings.cloudVaultToolAllowedFolders.placeholder": "Esempio: Public, Shared/Docs",

};
