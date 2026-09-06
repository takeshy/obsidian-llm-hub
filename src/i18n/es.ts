// Spanish translations
export const es: Record<string, string> = {
  // Settings - Headings
  "settings.cliProviders": "Proveedores CLI",

  // Settings - API

  // Settings - CLI
  "settings.cliIntro": "Verifica los proveedores CLI para usarlos como modelos. Los proveedores verificados aparecerán en la selección de modelos.",
  "settings.cliInstall": "Instalar: {{cmd}}",
  "settings.cliVerified": "Verificado",
  "settings.cliVerify": "Verificar",
  "settings.cliDisable": "Desactivar",
  "settings.cliVerifying": "Verificando...",
  "settings.cliVerifyingCli": "Verificando CLI...",
  "settings.cliNotFound": "CLI no encontrado: ",
  "settings.cliLoginRequired": "Inicio de sesión requerido: ",
  "settings.cliRunGeminiLogin": "Ejecuta el comando 'agy' y completa el inicio de sesión con /auth",
  "settings.cliRunClaudeLogin": "Ejecuta el comando 'claude' y completa el inicio de sesión",
  "settings.cliRunCodexLogin": "Ejecuta el comando 'codex' y completa el inicio de sesión",
  "settings.geminiCliVerified": "Antigravity CLI verificado",
  "settings.claudeCliVerified": "Claude CLI verificado",
  "settings.codexCliVerified": "Codex CLI verificado",
  "settings.geminiCliDisabled": "Antigravity CLI desactivado",
  "settings.claudeCliDisabled": "Claude CLI desactivado",
  "settings.codexCliDisabled": "Codex CLI desactivado",
  "settings.cliPathSettings": "Configurar ruta CLI",
  "settings.cliPathModal.title": "Configuración de ruta CLI",
  "settings.cliPathModal.desc": "Si el CLI no se detecta automáticamente, especifique la ruta completa aquí. El plugin busca automáticamente rutas de instalación comunes, incluyendo gestores de versiones (nodenv, nvm, volta, fnm, asdf, mise).",
  "settings.cliPathModal.placeholder": "Ruta al ejecutable o script CLI",
  "settings.cliPathModal.windowsNote": "Leave empty for auto-detection. To override Antigravity CLI, use the full path to agy.exe; Claude and Codex can use their standalone executable paths.",
  "settings.cliPathModal.unixNote": "Ejecute en terminal para encontrar la ruta:\nwhich agy (o which claude / which codex)",
  "settings.cliPathModal.versionManagerNote": "Los gestores de versiones Node.js (nodenv, nvm, volta, fnm, asdf, mise) se detectan automáticamente. Si la detección falla, especifique la ruta del script CLI directamente (ej. ~/.local/bin/agy).",
  "settings.cliPathModal.clear": "Borrar",
  "settings.cliPathModal.fileNotFound": "Archivo no encontrado. Por favor, verifica la ruta.",
  "settings.cliPathModal.invalidChars": "La ruta contiene caracteres inválidos.",
  "settings.cliPathSaved": "Ruta CLI guardada",
  "settings.cliPathCleared": "Ruta CLI borrada",

  // Settings - Local LLM
  "settings.localLlm": "LLM local",
  "settings.localLlmDesc": "Conectar a servidores LLM locales (Ollama, LM Studio, vLLM, etc.)",
  "settings.localLlmAdd": "Agregar LLM local",
  "settings.localLlmToolsDisabled": "Herramientas desactivadas automáticamente (el modelo rechazó la llamada a funciones)",
  "settings.localLlmToolsClear": "Reactivar herramientas",
  "settings.localLlmVerified": "LLM local verificado",
  "settings.localLlmDisabled": "LLM local desactivado",
  "settings.localLlmConfigure": "Configurar LLM local",
  "settings.localLlmModal.title": "Configuración de LLM local",
  "settings.localLlmModal.desc": "Configure la conexión a su servidor LLM local.",
  "settings.localLlmModal.framework": "Framework",
  "settings.localLlmModal.frameworkDesc": "Seleccione el framework de su servidor LLM",
  "settings.localLlmModal.baseUrl": "URL base",
  "settings.localLlmModal.baseUrlDesc": "URL del punto de acceso del servidor",
  "settings.localLlmModal.apiKey": "Clave API (opcional)",
  "settings.localLlmModal.apiKeyDesc": "Requerido solo para servicios que necesitan autenticación",
  "settings.localLlmModal.apiKeyDescAnythingllm": "Requerido para acceso a la API de AnythingLLM",
  "settings.localLlmModal.apiKeyPlaceholder": "Ingrese la clave API",
  "settings.localLlmModal.username": "Nombre de usuario",
  "settings.localLlmModal.usernameDesc": "Opcional. Se envía como HTTP Basic Auth (coincide con OPENCODE_SERVER_USERNAME).",
  "settings.localLlmModal.usernamePlaceholder": "nombre de usuario",
  "settings.localLlmModal.password": "Contraseña",
  "settings.localLlmModal.passwordDesc": "Opcional. Se envía como HTTP Basic Auth (coincide con OPENCODE_SERVER_PASSWORD).",
  "settings.localLlmModal.passwordPlaceholder": "contraseña",
  "settings.localLlmModal.model": "Modelo",
  "settings.localLlmModal.modelDesc": "Obtenga modelos del servidor, luego seleccione uno o más",
  "settings.localLlmModal.modelMultiDesc": "Cada modelo marcado se convierte en una entrada separada en el desplegable de chat.",
  "settings.localLlmModal.modelRequired": "Selecciona al menos un modelo",
  "settings.localLlmModal.fetchModels": "Obtener modelos",
  "settings.localLlmModal.fetching": "Obteniendo...",
  "settings.localLlmModal.modelsLoaded": "{{count}} modelos cargados",
  "settings.localLlmModal.noModelsFound": "No se encontraron modelos",
  "settings.localLlmModal.temperature": "Temperatura",
  "settings.localLlmModal.temperatureDesc": "0.0-2.0 (vacío = valor predeterminado del servidor)",
  "settings.localLlmModal.maxTokens": "Tokens máximos",
  "settings.localLlmModal.maxTokensDesc": "Tokens máximos de respuesta (vacío = valor predeterminado del servidor)",
  "settings.localLlmModal.serverDefault": "Valor predeterminado del servidor",
  "settings.localLlmModal.baseUrlRequired": "La URL base es requerida",
  "settings.localLlmModal.fetchRequired": "Por favor, obtenga los modelos primero",

  // Settings - API Providers
  "settings.apiProviders": "Proveedores de API",
  "settings.apiProviders.desc": "Conectar con proveedores de API compatibles con OpenAI (OpenAI, OpenRouter, Grok, etc.)",
  "settings.apiProviderAdd": "Agregar proveedor",
  "settings.apiProviderEdit": "Editar proveedor",
  "settings.apiProviderDelete": "Eliminar proveedor",
  "settings.apiProviderDisabled": "Desactivado",
  "settings.apiProviderConfigure": "Configurar proveedor de API",
  "settings.apiProviderType": "Tipo de proveedor",
  "settings.apiProviderCustom": "Personalizado",
  "settings.apiProviderName": "Nombre de visualización",
  "settings.apiProviderBaseUrl": "URL base",
  "settings.apiProviderApiKey": "Clave API",
  "settings.proxy": "Proxy",
  "settings.proxyUrl": "URL del proxy",
  "settings.proxyUrl.desc": "Proxy HTTP(S) para gateways corporativos (ej. http://proxy:8080)",
  "settings.proxyBypass": "Lista de exclusiones",
  "settings.proxyBypass.desc": "Hosts separados por comas que omiten el proxy (ej. api.openai.com, localhost)",
  "settings.apiProviderModel": "Modelos habilitados",
  "settings.apiProviderModel.desc": "Selecciona los modelos a utilizar. Haz clic en Verificar para descubrir modelos disponibles.",
  "settings.apiProviderModelFilter": "Filtrar modelos...",
  "settings.apiProviderAvailableModels": "Modelos disponibles",
  "settings.apiProviderVerify": "Verificar conexión",
  "settings.apiProviderVerified": "Verificado: {{count}} modelos encontrados",
  "settings.apiProviderVerifyFailed": "Verificación fallida: {{error}}",
  "settings.apiProviderNameRequired": "El nombre del proveedor es obligatorio",
  "settings.apiProviderApiKeyRequired": "La clave API es obligatoria",
  "settings.apiProviderVerifyRequired": "Por favor, verifique la conexión primero",
  "chat.noApiProvider": "No hay proveedor de API configurado. Agrega y verifica un proveedor en la configuración.",

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
  "settings.localPdfChunkPages": "Páginas PDF por fragmento",
  "settings.localPdfChunkPages.desc": "Número de páginas PDF por fragmento (1-6)",
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
  "settings.localEmbeddingBaseUrl": "URL base de API de embedding",
  "settings.localEmbeddingBaseUrl.desc": "URL base personalizada de API de embedding (dejar vacío para el valor predeterminado de Gemini). Usar para Ollama, OpenAI u otros servidores de embedding compatibles con OpenAI.",
  "settings.localEmbeddingBaseUrl.placeholder": "Ej. http://localhost:11434",
  "settings.localEmbeddingApiKey": "Clave API de embedding",
  "settings.localEmbeddingApiKey.desc": "Clave API para el servidor de embedding (opcional)",
  "settings.localEmbeddingApiKey.placeholder": "Introduce la clave API de embedding",
  "settings.searchFileExtensions": "Extensiones de archivo de búsqueda",
  "settings.searchFileExtensions.desc": "Extensiones de archivo separadas por comas para incluir en resultados (vacío = todas). Ej., md, pdf",
  "settings.searchFileExtensions.placeholder": "md, pdf",

  // Settings - Sync

  // Settings - RAG Files Modal

  // Common buttons
  "common.ok": "OK",
  "common.error": "Error: ",

  // RAG Setting Name Modal
  "modal.nameCannotBeEmpty": "El nombre no puede estar vacío",
  "modal.name": "Nombre",
  "modal.enterName": "Introduce el nombre",

  // Chat
  "chat.savedAsNote": "Guardado como {{path}}",
  "chat.chatDeleted": "Chat eliminado",
  "chat.configGeminiCli": "Antigravity CLI",
  "chat.configGeminiCliDesc": "Habilita el modo CLI y verifica que Antigravity CLI funciona",
  "chat.configClaudeCli": "Claude CLI",
  "chat.configClaudeCliDesc": "Habilita el modo CLI y verifica que Claude CLI funciona",
  "chat.configLocalLlm": "LLM local",
  "chat.configLocalLlmDesc": "Conectar a un servidor LLM local (Ollama, LM Studio, etc.)",
  "chat.rateLimitPaid": "Este modelo puede tener límite de tasa. Prueba otro modelo hasta mañana.",
  "chat.errorOccurred": "Lo siento, ocurrió un error: {{message}}",
  "chat.unknownError": "Error desconocido",
  "chat.localLlmNotConfigured": "La entrada de LLM local seleccionada no está configurada. Elige otro modelo o agrega uno en la configuración.",
  "chat.compactNotAvailable": "Comprimir no está disponible en modo CLI",
  "chat.yesterday": "Ayer",

  // InputArea
  "input.ragPdfChunkPages": "Páginas PDF por fragmento",
  "input.thinkingLabel": "Pensar siempre",

  // MessageBubble
  // Diff viewer
  "diff.restoreSize": "Restaurar tamaño",

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
  "editHistoryModal.confirmClearWithRemote": "¿Restaurar al estado remoto y borrar historial?",

  // Diff Modal

  // Edit History Buttons
  "editHistoryModal.showRemote": "Mostrar remoto",
  "editHistoryModal.loadingRemote": "Cargando...",
  "editHistoryModal.originLocal": "Local",
  "editHistoryModal.originRemote": "Remoto",

  // Status bar

  // Commands

  // Workflow Selector Modal

  // Errors

  // Encryption
  "settings.encryption": "Cifrado",
  "settings.encryptChatHistory": "Cifrar historial de chat de IA",
  "settings.encryptChatHistory.desc": "Cifrar archivos de historial de chat de IA. Requiere contraseña para ver el contenido.",
  "settings.encryptWorkflowHistory": "Cifrar registros de ejecución de workflows",
  "settings.encryptWorkflowHistory.desc": "Cifrar archivos de registros de ejecución de workflows. Requiere contraseña para ver el contenido.",
  "settings.encryptionSetup": "Configurar cifrado",
  "settings.encryptionSetup.desc": "Generar claves de cifrado. Puedes cifrar sin contraseña, pero necesitas la contraseña para descifrar.",
  "settings.encryptionSetupBtn": "Configurar claves de cifrado",
  "settings.encryptionPassword": "Contraseña de cifrado",
  "settings.encryptionPassword.desc": "Contraseña para proteger la clave privada. Requerida para descifrar.",
  "settings.encryptionPassword.placeholder": "Introduce la contraseña",
  "settings.encryptionConfirmPassword": "Confirmar contraseña",
  "settings.encryptionConfirmPassword.placeholder": "Confirmar contraseña",
  "settings.encryptionPasswordMismatch": "Las contraseñas no coinciden",
  "settings.encryptionSetupSuccess": "Claves de cifrado generadas exitosamente",
  "settings.encryptionSetupFailed": "Error al configurar cifrado: {{error}}",
  "settings.encryptionConfigured": "Cifrado configurado",
  "settings.encryptionConfigured.desc": "Las claves de cifrado están configuradas. Elige qué registros cifrar a continuación.",
  "settings.encryptionResetKeys": "Restablecer claves de cifrado",
  "settings.encryptionResetKeys.desc": "Generar nuevas claves de cifrado. Los chats cifrados anteriormente no serán legibles.",
  "settings.encryptionResetKeysConfirm": "¿Restablecer claves de cifrado? Todo el historial de chat cifrado anteriormente será ilegible.",
  "settings.encryptionKeysReset": "Las claves de cifrado han sido restablecidas",

  // Decryption
  "chat.encryptedChat": "Chat cifrado",
  "chat.decryptFailed": "Descifrado fallido. Verifica tu contraseña.",
  "chat.decrypted": "Descifrado exitosamente",

  // Workflow Generation Modal
  "workflow.generation.generatingWithCli": "Generando con {{cli}}",

  // Workflow Preview Modal

  // Workflow Confirm Modal

  // Execution History Select Modal

  // Workflow Execution Modal

  // CryptView - File Encryption

  // MCP Server Settings
  "settings.mcpTransport": "Transporte",
  "settings.mcpTransport.http": "HTTP (Streamable HTTP)",
  "settings.mcpTransport.stdio": "Stdio (proceso local)",
  "settings.mcpTransport.stdioDesktopOnly": "El transporte Stdio solo está disponible en escritorio",
  "settings.mcpServerCommand": "Comando",
  "settings.mcpServerCommand.placeholder": "npx, uvx o /ruta/al/servidor",
  "settings.mcpServerArgs": "Argumentos",
  "settings.mcpServerArgs.placeholder": "-y @modelcontextprotocol/server-name",
  "settings.mcpServerFraming": "Protocolo de encuadre",
  "settings.mcpServerFraming.contentLength": "Content-Length (servidores TypeScript/npx)",
  "settings.mcpServerFraming.newline": "Delimitado por salto de línea (servidores Python/uvx)",
  "settings.mcpServerEnv": "Variables de entorno (JSON)",
  "settings.mcpServerEnv.placeholder": "{\"API_KEY\": \"xxx\"}",
  "settings.mcpServerEnv.desc": "Variables de entorno opcionales para el proceso del servidor (formato JSON)",
  "settings.mcpServerCommandRequired": "Se requiere un comando para el transporte Stdio",
  "settings.mcpServerInvalidEnv": "JSON inválido para variables de entorno",

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
  "settings.discord": "Integración con Discord",
  "settings.discordEnabled": "Activar bot de Discord",
  "settings.discordEnabled.desc": "Iniciar el bot de Discord al cargar el plugin",
  "settings.discordBotToken": "Token del bot",
  "settings.discordBotToken.desc": "Token del bot de Discord desde el Developer Portal (Bot → Token)",
  "settings.discordBotToken.placeholder": "Introduce el token de tu bot de Discord",
  "settings.discordConnection": "Conexión",
  "settings.discordConnection.desc": "Conectar o desconectar el bot de Discord",
  "settings.discordConnect": "Conectar",
  "settings.discordDisconnect": "Desconectar",
  "settings.discordVerifying": "Verificando...",
  "settings.discordStatusConnected": "El bot está conectado",
  "settings.discordStatusDisconnected": "El bot no está conectado",
  "settings.discordDisconnected": "Bot de Discord desconectado",
  "settings.discordVerifyFailed": "Falló la verificación del token de Discord: {{error}}",
  "settings.discordStartFailed": "No se pudo iniciar el bot de Discord: {{error}}",
  "settings.discordRespondToDMs": "Responder a DMs",
  "settings.discordRespondToDMs.desc": "Si el bot responde a mensajes directos",
  "settings.discordRequireMention": "Requerir @mención en canales",
  "settings.discordRequireMention.desc": "Cuando está activado, el bot solo responde cuando es mencionado en canales del servidor",
  "settings.discordAllowedChannels": "IDs de canales permitidos",
  "settings.discordAllowedChannels.desc": "IDs de canales de Discord separados por comas. Déjalo vacío para permitir todos los canales.",
  "settings.discordAllowedChannels.placeholder": "123456789,987654321",
  "settings.discordAllowedUsers": "IDs de usuarios permitidos",
  "settings.discordAllowedUsers.desc": "IDs de usuarios de Discord separados por comas. Déjalo vacío para permitir todos los usuarios.",
  "settings.discordAllowedUsers.placeholder": "123456789,987654321",
  "settings.discordModel": "Modelo",
  "settings.discordModel.desc": "Modelo a usar para las respuestas de Discord (ej. api:provider_id:model_name). Déjalo vacío para usar el modelo actualmente seleccionado.",
  "settings.discordModel.placeholder": "Usar el modelo actual",
  "settings.discordSystemPrompt": "System prompt",
  "settings.discordSystemPrompt.desc": "System prompt personalizado para las respuestas de Discord. Déjalo vacío para usar el predeterminado.",
  "settings.discordSystemPrompt.placeholder": "Eres un asistente útil en Discord...",
  "settings.discordMaxResponseLength": "Longitud máxima de respuesta",
  "settings.discordMaxResponseLength.desc": "Máximo de caracteres por mensaje de Discord (límite de Discord: 2000)",

  // Search tab
  "search.discussWithSelected": "Discutir con lo seleccionado",
  "search.pdfMode": "Resultados PDF",
  "search.helpTitle": "Ayuda de parámetros",
  "search.helpTopK": "Top K — Número máximo de resultados a devolver.",
  "search.helpScoreThreshold": "Puntuación mínima — Puntuación de similitud mínima (0.0–1.0). Los resultados por debajo se excluyen.",
  "search.helpExt": "Ext. — Extensiones de archivo separadas por comas para filtrar (ej. md, pdf). Vacío = todos los archivos.",
  "search.helpChunkSize": "Tamaño de fragmento — Número de caracteres por fragmento de texto al indexar. Fragmentos más grandes retienen más contexto pero pueden reducir la precisión.",
  "search.helpChunkOverlap": "Superposición de fragmentos — Número de caracteres superpuestos entre fragmentos adyacentes. Ayuda a preservar el contexto en los límites.",
  "search.helpPdfChunkPages": "Páginas por fragmento PDF — Número de páginas agrupadas en un solo fragmento al indexar PDFs.",

  // RAG source modal

  // LLM vault tool folders
  "settings.cloudVaultToolAllowedFolders": "Carpetas para herramientas de bóveda del LLM",
  "settings.cloudVaultToolAllowedFolders.desc": "Carpetas separadas por comas a las que pueden acceder las herramientas de bóveda del LLM y los workflows de skills activados por el LLM. Déjalo vacío para permitir toda la bóveda. Esto no limita RAG, los archivos adjuntos manuales, las menciones @note, las herramientas MCP, los scripts ni los comandos de shell.",
  "settings.cloudVaultToolAllowedFolders.placeholder": "Ejemplo: Public, Shared/Docs",

};
