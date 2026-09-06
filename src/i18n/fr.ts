// French translations
export const fr: Record<string, string> = {
  // Settings - Headings
  "settings.cliProviders": "Fournisseurs CLI",

  // Settings - API

  // Settings - CLI
  "settings.cliIntro": "Vérifiez les fournisseurs CLI pour les utiliser comme modèles. Les fournisseurs vérifiés apparaîtront dans la sélection de modèles.",
  "settings.cliInstall": "Installer : {{cmd}}",
  "settings.cliVerified": "Vérifié",
  "settings.cliVerify": "Vérifier",
  "settings.cliDisable": "Désactiver",
  "settings.cliVerifying": "Vérification...",
  "settings.cliVerifyingCli": "Vérification du CLI...",
  "settings.cliNotFound": "CLI non trouvé : ",
  "settings.cliLoginRequired": "Connexion requise : ",
  "settings.cliRunGeminiLogin": "Exécutez la commande 'agy' et complétez la connexion avec /auth",
  "settings.cliRunClaudeLogin": "Exécutez la commande 'claude' et complétez la connexion",
  "settings.cliRunCodexLogin": "Exécutez la commande 'codex' et complétez la connexion",
  "settings.geminiCliVerified": "Antigravity CLI vérifié",
  "settings.claudeCliVerified": "Claude CLI vérifié",
  "settings.codexCliVerified": "Codex CLI vérifié",
  "settings.geminiCliDisabled": "Antigravity CLI désactivé",
  "settings.claudeCliDisabled": "Claude CLI désactivé",
  "settings.codexCliDisabled": "Codex CLI désactivé",
  "settings.cliPathSettings": "Configurer le chemin CLI",
  "settings.cliPathModal.title": "Paramètres du chemin CLI",
  "settings.cliPathModal.desc": "Si le CLI n'est pas détecté automatiquement, spécifiez le chemin complet ici. Le plugin recherche automatiquement les chemins d'installation courants, y compris les gestionnaires de versions (nodenv, nvm, volta, fnm, asdf, mise).",
  "settings.cliPathModal.placeholder": "Chemin vers l'exécutable ou le script CLI",
  "settings.cliPathModal.windowsNote": "Leave empty for auto-detection. To override Antigravity CLI, use the full path to agy.exe; Claude and Codex can use their standalone executable paths.",
  "settings.cliPathModal.unixNote": "Exécutez dans le terminal pour trouver le chemin :\nwhich agy (ou which claude / which codex)",
  "settings.cliPathModal.versionManagerNote": "Les gestionnaires de versions Node.js (nodenv, nvm, volta, fnm, asdf, mise) sont détectés automatiquement. Si la détection échoue, spécifiez directement le chemin du script CLI (ex. ~/.local/bin/agy).",
  "settings.cliPathModal.clear": "Effacer",
  "settings.cliPathModal.fileNotFound": "Fichier introuvable. Veuillez vérifier le chemin.",
  "settings.cliPathModal.invalidChars": "Le chemin contient des caractères invalides.",
  "settings.cliPathSaved": "Chemin CLI enregistré",
  "settings.cliPathCleared": "Chemin CLI effacé",

  // Settings - Local LLM
  "settings.localLlm": "LLM local",
  "settings.localLlmDesc": "Se connecter aux serveurs LLM locaux (Ollama, LM Studio, vLLM, etc.)",
  "settings.localLlmAdd": "Ajouter un LLM local",
  "settings.localLlmToolsDisabled": "Outils désactivés automatiquement (le modèle a rejeté l'appel de fonction)",
  "settings.localLlmToolsClear": "Réactiver les outils",
  "settings.localLlmVerified": "LLM local vérifié",
  "settings.localLlmDisabled": "LLM local désactivé",
  "settings.localLlmConfigure": "Configurer le LLM local",
  "settings.localLlmModal.title": "Configuration du LLM local",
  "settings.localLlmModal.desc": "Configurez la connexion à votre serveur LLM local.",
  "settings.localLlmModal.framework": "Framework",
  "settings.localLlmModal.frameworkDesc": "Sélectionnez le framework de votre serveur LLM",
  "settings.localLlmModal.baseUrl": "URL de base",
  "settings.localLlmModal.baseUrlDesc": "URL du point d'accès du serveur",
  "settings.localLlmModal.apiKey": "Clé API (optionnel)",
  "settings.localLlmModal.apiKeyDesc": "Requis uniquement pour les services nécessitant une authentification",
  "settings.localLlmModal.apiKeyDescAnythingllm": "Requis pour l'accès à l'API AnythingLLM",
  "settings.localLlmModal.apiKeyPlaceholder": "Entrez la clé API",
  "settings.localLlmModal.username": "Nom d'utilisateur",
  "settings.localLlmModal.usernameDesc": "Optionnel. Envoyé en HTTP Basic Auth (correspond à OPENCODE_SERVER_USERNAME).",
  "settings.localLlmModal.usernamePlaceholder": "nom d'utilisateur",
  "settings.localLlmModal.password": "Mot de passe",
  "settings.localLlmModal.passwordDesc": "Optionnel. Envoyé en HTTP Basic Auth (correspond à OPENCODE_SERVER_PASSWORD).",
  "settings.localLlmModal.passwordPlaceholder": "mot de passe",
  "settings.localLlmModal.model": "Modèle",
  "settings.localLlmModal.modelDesc": "Récupérez les modèles du serveur, puis sélectionnez-en un ou plusieurs",
  "settings.localLlmModal.modelMultiDesc": "Chaque modèle coché devient une entrée distincte dans le menu déroulant du chat.",
  "settings.localLlmModal.modelRequired": "Sélectionnez au moins un modèle",
  "settings.localLlmModal.fetchModels": "Récupérer les modèles",
  "settings.localLlmModal.fetching": "Récupération...",
  "settings.localLlmModal.modelsLoaded": "{{count}} modèles chargés",
  "settings.localLlmModal.noModelsFound": "Aucun modèle trouvé",
  "settings.localLlmModal.temperature": "Température",
  "settings.localLlmModal.temperatureDesc": "0.0-2.0 (vide = valeur par défaut du serveur)",
  "settings.localLlmModal.maxTokens": "Tokens max",
  "settings.localLlmModal.maxTokensDesc": "Nombre maximum de tokens de réponse (vide = valeur par défaut du serveur)",
  "settings.localLlmModal.serverDefault": "Valeur par défaut du serveur",
  "settings.localLlmModal.baseUrlRequired": "L'URL de base est requise",
  "settings.localLlmModal.fetchRequired": "Veuillez d'abord récupérer les modèles",

  // Settings - API Providers
  "settings.apiProviders": "Fournisseurs d'API",
  "settings.apiProviders.desc": "Connectez-vous à des fournisseurs d'API compatibles OpenAI (OpenAI, OpenRouter, Grok, etc.)",
  "settings.apiProviderAdd": "Ajouter un fournisseur",
  "settings.apiProviderEdit": "Modifier le fournisseur",
  "settings.apiProviderDelete": "Supprimer le fournisseur",
  "settings.apiProviderDisabled": "Désactivé",
  "settings.apiProviderConfigure": "Configurer le fournisseur d'API",
  "settings.apiProviderType": "Type de fournisseur",
  "settings.apiProviderCustom": "Personnalisé",
  "settings.apiProviderName": "Nom d'affichage",
  "settings.apiProviderBaseUrl": "URL de base",
  "settings.apiProviderApiKey": "Clé API",
  "settings.proxy": "Proxy",
  "settings.proxyUrl": "URL du proxy",
  "settings.proxyUrl.desc": "Proxy HTTP(S) pour passerelles d'entreprise (ex. http://proxy:8080)",
  "settings.proxyBypass": "Liste d'exclusions",
  "settings.proxyBypass.desc": "Hôtes séparés par des virgules qui contournent le proxy (ex. api.openai.com, localhost)",
  "settings.apiProviderModel": "Modèles activés",
  "settings.apiProviderModel.desc": "Sélectionnez les modèles à utiliser. Cliquez sur Vérifier pour découvrir les modèles disponibles.",
  "settings.apiProviderModelFilter": "Filtrer les modèles...",
  "settings.apiProviderAvailableModels": "Modèles disponibles",
  "settings.apiProviderVerify": "Vérifier la connexion",
  "settings.apiProviderVerified": "Vérifié : {{count}} modèles trouvés",
  "settings.apiProviderVerifyFailed": "Échec de la vérification : {{error}}",
  "settings.apiProviderNameRequired": "Le nom du fournisseur est requis",
  "settings.apiProviderApiKeyRequired": "La clé API est requise",
  "settings.apiProviderVerifyRequired": "Veuillez d'abord vérifier la connexion",
  "chat.noApiProvider": "Aucun fournisseur d'API configuré. Veuillez ajouter et vérifier un fournisseur dans les paramètres.",

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
  "settings.localPdfChunkPages": "Pages PDF par fragment",
  "settings.localPdfChunkPages.desc": "Nombre de pages PDF par fragment (1-6)",
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
  "settings.localEmbeddingBaseUrl": "URL de base de l'API d'embedding",
  "settings.localEmbeddingBaseUrl.desc": "URL de base personnalisée de l'API d'embedding (laisser vide pour la valeur par défaut Gemini). Utiliser pour Ollama, OpenAI ou d'autres serveurs d'embedding compatibles OpenAI.",
  "settings.localEmbeddingBaseUrl.placeholder": "Ex. http://localhost:11434",
  "settings.localEmbeddingApiKey": "Clé API d'embedding",
  "settings.localEmbeddingApiKey.desc": "Clé API pour le serveur d'embedding (optionnel)",
  "settings.localEmbeddingApiKey.placeholder": "Entrez la clé API d'embedding",
  "settings.searchFileExtensions": "Extensions de fichiers de recherche",
  "settings.searchFileExtensions.desc": "Extensions de fichiers séparées par des virgules à inclure dans les résultats (vide = toutes). Ex., md, pdf",
  "settings.searchFileExtensions.placeholder": "md, pdf",

  // Settings - Sync

  // Settings - RAG Files Modal

  // Common buttons
  "common.ok": "OK",
  "common.error": "Erreur : ",

  // RAG Setting Name Modal
  "modal.nameCannotBeEmpty": "Le nom ne peut pas être vide",
  "modal.name": "Nom",
  "modal.enterName": "Entrez le nom",

  // Chat
  "chat.savedAsNote": "Sauvegardé sous {{path}}",
  "chat.chatDeleted": "Chat supprimé",
  "chat.configGeminiCli": "Antigravity CLI",
  "chat.configGeminiCliDesc": "Activez le mode CLI et vérifiez que Antigravity CLI fonctionne",
  "chat.configClaudeCli": "Claude CLI",
  "chat.configClaudeCliDesc": "Activez le mode CLI et vérifiez que Claude CLI fonctionne",
  "chat.configLocalLlm": "LLM local",
  "chat.configLocalLlmDesc": "Se connecter à un serveur LLM local (Ollama, LM Studio, etc.)",
  "chat.rateLimitPaid": "Ce modèle peut être limité en débit. Essayez un autre modèle jusqu'à demain.",
  "chat.errorOccurred": "Désolé, une erreur s'est produite : {{message}}",
  "chat.unknownError": "Erreur inconnue",
  "chat.localLlmNotConfigured": "L'entrée LLM local sélectionnée n'est pas configurée. Choisissez un autre modèle ou ajoutez-en un dans les paramètres.",
  "chat.compactNotAvailable": "La compression n'est pas disponible en mode CLI",
  "chat.yesterday": "Hier",

  // InputArea
  "input.ragPdfChunkPages": "Pages PDF par fragment",
  "input.thinkingLabel": "Toujours réfléchir",

  // MessageBubble
  // Diff viewer
  "diff.restoreSize": "Restaurer la taille",

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
  "editHistoryModal.confirmClearWithRemote": "Restaurer l'état distant et effacer l'historique ?",

  // Diff Modal

  // Edit History Buttons
  "editHistoryModal.showRemote": "Afficher le distant",
  "editHistoryModal.loadingRemote": "Chargement...",
  "editHistoryModal.originLocal": "Local",
  "editHistoryModal.originRemote": "Distant",

  // Status bar

  // Commands

  // Workflow Selector Modal

  // Errors

  // Encryption
  "settings.encryption": "Chiffrement",
  "settings.encryptChatHistory": "Chiffrer l'historique de chat IA",
  "settings.encryptChatHistory.desc": "Chiffrer les fichiers d'historique de chat IA. Mot de passe requis pour voir le contenu.",
  "settings.encryptWorkflowHistory": "Chiffrer les journaux d'exécution de workflows",
  "settings.encryptWorkflowHistory.desc": "Chiffrer les fichiers de journaux d'exécution de workflows. Mot de passe requis pour voir le contenu.",
  "settings.encryptionSetup": "Configurer le chiffrement",
  "settings.encryptionSetup.desc": "Générer les clés de chiffrement. Vous pouvez chiffrer sans mot de passe, mais le mot de passe est nécessaire pour déchiffrer.",
  "settings.encryptionSetupBtn": "Générer les clés de chiffrement",
  "settings.encryptionPassword": "Mot de passe de chiffrement",
  "settings.encryptionPassword.desc": "Mot de passe pour protéger la clé privée. Requis pour le déchiffrement.",
  "settings.encryptionPassword.placeholder": "Entrez le mot de passe",
  "settings.encryptionConfirmPassword": "Confirmer le mot de passe",
  "settings.encryptionConfirmPassword.placeholder": "Confirmez le mot de passe",
  "settings.encryptionPasswordMismatch": "Les mots de passe ne correspondent pas",
  "settings.encryptionSetupSuccess": "Clés de chiffrement générées avec succès",
  "settings.encryptionSetupFailed": "Échec de la configuration du chiffrement : {{error}}",
  "settings.encryptionConfigured": "Chiffrement configuré",
  "settings.encryptionConfigured.desc": "Les clés de chiffrement sont en place. Choisissez les journaux à chiffrer ci-dessous.",
  "settings.encryptionResetKeys": "Réinitialiser les clés de chiffrement",
  "settings.encryptionResetKeys.desc": "Générer de nouvelles clés de chiffrement. Les chats précédemment chiffrés ne seront plus lisibles.",
  "settings.encryptionResetKeysConfirm": "Réinitialiser les clés de chiffrement ? Tout l'historique de chat précédemment chiffré deviendra illisible.",
  "settings.encryptionKeysReset": "Les clés de chiffrement ont été réinitialisées",

  // Decryption
  "chat.encryptedChat": "Chat chiffré",
  "chat.decryptFailed": "Échec du déchiffrement. Vérifiez votre mot de passe.",
  "chat.decrypted": "Déchiffré avec succès",

  // Workflow Generation Modal
  "workflow.generation.generatingWithCli": "Génération avec {{cli}}",

  // Workflow Preview Modal

  // Workflow Confirm Modal

  // Execution History Select Modal

  // Workflow Execution Modal

  // CryptView - File Encryption

  // MCP Server Settings
  "settings.mcpTransport": "Transport",
  "settings.mcpTransport.http": "HTTP (Streamable HTTP)",
  "settings.mcpTransport.stdio": "Stdio (processus local)",
  "settings.mcpTransport.stdioDesktopOnly": "Le transport Stdio n'est disponible que sur bureau",
  "settings.mcpServerCommand": "Commande",
  "settings.mcpServerCommand.placeholder": "npx, uvx ou /chemin/vers/serveur",
  "settings.mcpServerArgs": "Arguments",
  "settings.mcpServerArgs.placeholder": "-y @modelcontextprotocol/server-name",
  "settings.mcpServerFraming": "Protocole de cadrage",
  "settings.mcpServerFraming.contentLength": "Content-Length (serveurs TypeScript/npx)",
  "settings.mcpServerFraming.newline": "Délimité par saut de ligne (serveurs Python/uvx)",
  "settings.mcpServerEnv": "Variables d'environnement (JSON)",
  "settings.mcpServerEnv.placeholder": "{\"API_KEY\": \"xxx\"}",
  "settings.mcpServerEnv.desc": "Variables d'environnement optionnelles pour le processus serveur (format JSON)",
  "settings.mcpServerCommandRequired": "La commande est requise pour le transport Stdio",
  "settings.mcpServerInvalidEnv": "JSON invalide pour les variables d'environnement",

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
  "settings.discord": "Intégration Discord",
  "settings.discordEnabled": "Activer le bot Discord",
  "settings.discordEnabled.desc": "Démarrer le bot Discord au chargement du plugin",
  "settings.discordBotToken": "Token du bot",
  "settings.discordBotToken.desc": "Token du bot Discord depuis le Developer Portal (Bot → Token)",
  "settings.discordBotToken.placeholder": "Saisissez le token de votre bot Discord",
  "settings.discordConnection": "Connexion",
  "settings.discordConnection.desc": "Connecter ou déconnecter le bot Discord",
  "settings.discordConnect": "Connecter",
  "settings.discordDisconnect": "Déconnecter",
  "settings.discordVerifying": "Vérification...",
  "settings.discordStatusConnected": "Le bot est connecté",
  "settings.discordStatusDisconnected": "Le bot n'est pas connecté",
  "settings.discordDisconnected": "Bot Discord déconnecté",
  "settings.discordVerifyFailed": "Échec de la vérification du token Discord : {{error}}",
  "settings.discordStartFailed": "Le bot Discord n'a pas pu démarrer : {{error}}",
  "settings.discordRespondToDMs": "Répondre aux DM",
  "settings.discordRespondToDMs.desc": "Si le bot répond aux messages directs",
  "settings.discordRequireMention": "Exiger @mention dans les canaux",
  "settings.discordRequireMention.desc": "Lorsque activé, le bot ne répond que lorsqu'il est mentionné dans les canaux du serveur",
  "settings.discordAllowedChannels": "IDs de canaux autorisés",
  "settings.discordAllowedChannels.desc": "IDs de canaux Discord séparés par des virgules. Laissez vide pour autoriser tous les canaux.",
  "settings.discordAllowedChannels.placeholder": "123456789,987654321",
  "settings.discordAllowedUsers": "IDs d'utilisateurs autorisés",
  "settings.discordAllowedUsers.desc": "IDs d'utilisateurs Discord séparés par des virgules. Laissez vide pour autoriser tous les utilisateurs.",
  "settings.discordAllowedUsers.placeholder": "123456789,987654321",
  "settings.discordModel": "Modèle",
  "settings.discordModel.desc": "Modèle à utiliser pour les réponses Discord (ex. api:provider_id:model_name). Laissez vide pour utiliser le modèle actuellement sélectionné.",
  "settings.discordModel.placeholder": "Utiliser le modèle actuel",
  "settings.discordSystemPrompt": "System prompt",
  "settings.discordSystemPrompt.desc": "System prompt personnalisé pour les réponses Discord. Laissez vide pour utiliser celui par défaut.",
  "settings.discordSystemPrompt.placeholder": "Vous êtes un assistant utile sur Discord...",
  "settings.discordMaxResponseLength": "Longueur maximale de réponse",
  "settings.discordMaxResponseLength.desc": "Nombre maximum de caractères par message Discord (limite Discord : 2000)",

  // Search tab
  "search.discussWithSelected": "Discuter avec la sélection",
  "search.pdfMode": "Résultats PDF",
  "search.helpTitle": "Aide sur les paramètres",
  "search.helpTopK": "Top K — Nombre maximum de résultats à retourner.",
  "search.helpScoreThreshold": "Score minimum — Score de similarité minimum (0.0–1.0). Les résultats en dessous sont exclus.",
  "search.helpExt": "Ext. — Extensions de fichiers séparées par des virgules pour filtrer (ex. md, pdf). Vide = tous les fichiers.",
  "search.helpChunkSize": "Taille de fragment — Nombre de caractères par fragment de texte lors de l'indexation. Des fragments plus grands conservent plus de contexte mais peuvent réduire la précision.",
  "search.helpChunkOverlap": "Chevauchement de fragments — Nombre de caractères chevauchants entre fragments adjacents. Aide à préserver le contexte aux limites.",
  "search.helpPdfChunkPages": "Pages par fragment PDF — Nombre de pages regroupées en un fragment lors de l'indexation des PDFs.",

  // RAG source modal

  // LLM vault tool folders
  "settings.cloudVaultToolAllowedFolders": "Dossiers des outils de coffre LLM",
  "settings.cloudVaultToolAllowedFolders.desc": "Dossiers séparés par des virgules auxquels les outils de coffre LLM et les workflows de skills déclenchés par le LLM peuvent accéder. Laissez vide pour autoriser l'ensemble du coffre. Cela ne limite pas le RAG, les pièces jointes manuelles, les mentions @note, les outils MCP, les scripts ni les commandes shell.",
  "settings.cloudVaultToolAllowedFolders.placeholder": "Exemple : Public, Shared/Docs",

};
