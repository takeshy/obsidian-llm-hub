// Portuguese translations
export const pt: Record<string, string> = {
  // Settings - Headings
  "settings.cliProviders": "Provedores CLI",

  // Settings - API

  // Settings - CLI
  "settings.cliIntro": "Verifique os provedores CLI para usa-los como modelos. Provedores verificados aparecerao na selecao de modelos.",
  "settings.cliInstall": "Instalar: {{cmd}}",
  "settings.cliVerified": "Verificado",
  "settings.cliVerify": "Verificar",
  "settings.cliDisable": "Desativar",
  "settings.cliVerifying": "Verificando...",
  "settings.cliVerifyingCli": "Verificando CLI...",
  "settings.cliNotFound": "CLI nao encontrado: ",
  "settings.cliLoginRequired": "Login necessario: ",
  "settings.cliRunGeminiLogin": "Execute o comando 'agy' e complete o login com /auth",
  "settings.cliRunClaudeLogin": "Execute o comando 'claude' e complete o login",
  "settings.cliRunCodexLogin": "Execute o comando 'codex' e complete o login",
  "settings.geminiCliVerified": "Antigravity CLI verificado",
  "settings.claudeCliVerified": "Claude CLI verificado",
  "settings.codexCliVerified": "Codex CLI verificado",
  "settings.geminiCliDisabled": "Antigravity CLI desativado",
  "settings.claudeCliDisabled": "Claude CLI desativado",
  "settings.codexCliDisabled": "Codex CLI desativado",
  "settings.cliPathSettings": "Configurar caminho CLI",
  "settings.cliPathModal.title": "Configuracoes de caminho CLI",
  "settings.cliPathModal.desc": "Se o CLI nao for detectado automaticamente, especifique o caminho completo aqui. O plugin pesquisa automaticamente caminhos de instalacao comuns, incluindo gerenciadores de versao (nodenv, nvm, volta, fnm, asdf, mise).",
  "settings.cliPathModal.placeholder": "Caminho para o executavel ou script CLI",
  "settings.cliPathModal.windowsNote": "Leave empty for auto-detection. To override Antigravity CLI, use the full path to agy.exe; Claude and Codex can use their standalone executable paths.",
  "settings.cliPathModal.unixNote": "Execute no terminal para encontrar o caminho:\nwhich agy (ou which claude / which codex)",
  "settings.cliPathModal.versionManagerNote": "Gerenciadores de versao Node.js (nodenv, nvm, volta, fnm, asdf, mise) sao detectados automaticamente. Se a deteccao falhar, especifique o caminho do script CLI diretamente (ex. ~/.local/bin/agy).",
  "settings.cliPathModal.clear": "Limpar",
  "settings.cliPathModal.fileNotFound": "Arquivo nao encontrado. Por favor, verifique o caminho.",
  "settings.cliPathModal.invalidChars": "O caminho contem caracteres invalidos.",
  "settings.cliPathSaved": "Caminho CLI salvo",
  "settings.cliPathCleared": "Caminho CLI limpo",

  // Settings - Local LLM
  "settings.localLlm": "LLM local",
  "settings.localLlmDesc": "Conectar a servidores LLM locais (Ollama, LM Studio, vLLM, etc.)",
  "settings.localLlmAdd": "Adicionar LLM local",
  "settings.localLlmToolsDisabled": "Ferramentas desativadas automaticamente (o modelo rejeitou a chamada de função)",
  "settings.localLlmToolsClear": "Reativar ferramentas",
  "settings.localLlmVerified": "LLM local verificado",
  "settings.localLlmDisabled": "LLM local desativado",
  "settings.localLlmConfigure": "Configurar LLM local",
  "settings.localLlmModal.title": "Configuração do LLM local",
  "settings.localLlmModal.desc": "Configure a conexão com seu servidor LLM local.",
  "settings.localLlmModal.framework": "Framework",
  "settings.localLlmModal.frameworkDesc": "Selecione o framework do seu servidor LLM",
  "settings.localLlmModal.baseUrl": "URL base",
  "settings.localLlmModal.baseUrlDesc": "URL do endpoint do servidor",
  "settings.localLlmModal.apiKey": "Chave API (opcional)",
  "settings.localLlmModal.apiKeyDesc": "Necessário apenas para serviços que requerem autenticação",
  "settings.localLlmModal.apiKeyDescAnythingllm": "Necessário para acesso à API do AnythingLLM",
  "settings.localLlmModal.apiKeyPlaceholder": "Digite a chave API",
  "settings.localLlmModal.username": "Nome de usuário",
  "settings.localLlmModal.usernameDesc": "Opcional. Enviado como HTTP Basic Auth (corresponde a OPENCODE_SERVER_USERNAME).",
  "settings.localLlmModal.usernamePlaceholder": "nome de usuário",
  "settings.localLlmModal.password": "Senha",
  "settings.localLlmModal.passwordDesc": "Opcional. Enviado como HTTP Basic Auth (corresponde a OPENCODE_SERVER_PASSWORD).",
  "settings.localLlmModal.passwordPlaceholder": "senha",
  "settings.localLlmModal.model": "Modelo",
  "settings.localLlmModal.modelDesc": "Busque modelos do servidor e selecione um ou mais",
  "settings.localLlmModal.modelMultiDesc": "Cada modelo marcado se torna uma entrada separada no menu suspenso do chat.",
  "settings.localLlmModal.modelRequired": "Selecione pelo menos um modelo",
  "settings.localLlmModal.fetchModels": "Buscar modelos",
  "settings.localLlmModal.fetching": "Buscando...",
  "settings.localLlmModal.modelsLoaded": "{{count}} modelos carregados",
  "settings.localLlmModal.noModelsFound": "Nenhum modelo encontrado",
  "settings.localLlmModal.temperature": "Temperatura",
  "settings.localLlmModal.temperatureDesc": "0.0-2.0 (vazio = padrão do servidor)",
  "settings.localLlmModal.maxTokens": "Tokens máximos",
  "settings.localLlmModal.maxTokensDesc": "Tokens máximos de resposta (vazio = padrão do servidor)",
  "settings.localLlmModal.serverDefault": "Padrão do servidor",
  "settings.localLlmModal.baseUrlRequired": "URL base é obrigatória",
  "settings.localLlmModal.fetchRequired": "Por favor, busque os modelos primeiro",

  // Settings - Provedores de API
  "settings.apiProviders": "Provedores de API",
  "settings.apiProviders.desc": "Conectar a provedores de API compativeis com OpenAI (OpenAI, OpenRouter, Grok, etc.)",
  "settings.apiProviderAdd": "Adicionar provedor",
  "settings.apiProviderEdit": "Editar provedor",
  "settings.apiProviderDelete": "Excluir provedor",
  "settings.apiProviderDisabled": "Desativado",
  "settings.apiProviderConfigure": "Configurar provedor de API",
  "settings.apiProviderType": "Tipo de provedor",
  "settings.apiProviderCustom": "Personalizado",
  "settings.apiProviderName": "Nome de exibicao",
  "settings.apiProviderBaseUrl": "URL base",
  "settings.apiProviderApiKey": "Chave API",
  "settings.proxy": "Proxy",
  "settings.proxyUrl": "URL do proxy",
  "settings.proxyUrl.desc": "Proxy HTTP(S) para gateways corporativos (ex. http://proxy:8080)",
  "settings.proxyBypass": "Lista de exclusões",
  "settings.proxyBypass.desc": "Hosts separados por vírgula que ignoram o proxy (ex. api.openai.com, localhost)",
  "settings.apiProviderModel": "Modelos habilitados",
  "settings.apiProviderModel.desc": "Selecione os modelos a utilizar. Clique em Verificar para descobrir modelos disponiveis.",
  "settings.apiProviderModelFilter": "Filtrar modelos...",
  "settings.apiProviderAvailableModels": "Modelos disponiveis",
  "settings.apiProviderVerify": "Verificar conexao",
  "settings.apiProviderVerified": "Verificado: {{count}} modelos encontrados",
  "settings.apiProviderVerifyFailed": "Verificacao falhou: {{error}}",
  "settings.apiProviderNameRequired": "O nome do provedor e obrigatorio",
  "settings.apiProviderApiKeyRequired": "A chave API e obrigatoria",
  "settings.apiProviderVerifyRequired": "Por favor, verifique a conexao primeiro",
  "chat.noApiProvider": "Nenhum provedor de API configurado. Adicione e verifique um provedor nas configuracoes.",

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
  "settings.localEmbeddingBaseUrl": "URL base da API de embedding",
  "settings.localEmbeddingBaseUrl.desc": "URL base personalizada da API de embedding (deixe vazio para o padrao Gemini). Use para Ollama, OpenAI ou outros servidores de embedding compativeis com OpenAI.",
  "settings.localEmbeddingBaseUrl.placeholder": "Ex. http://localhost:11434",
  "settings.localEmbeddingApiKey": "Chave API de embedding",
  "settings.localEmbeddingApiKey.desc": "Chave API para o servidor de embedding (opcional)",
  "settings.localEmbeddingApiKey.placeholder": "Digite a chave API de embedding",
  "settings.searchFileExtensions": "Extensoes de arquivo de pesquisa",
  "settings.searchFileExtensions.desc": "Extensoes de arquivo separadas por virgulas para incluir nos resultados (vazio = todas). Ex., md, pdf",
  "settings.searchFileExtensions.placeholder": "md, pdf",

  // Settings - Sync

  // Settings - RAG Files Modal

  // Common buttons
  "common.ok": "OK",
  "common.error": "Erro: ",

  // RAG Setting Name Modal
  "modal.nameCannotBeEmpty": "O nome nao pode estar vazio",
  "modal.name": "Nome",
  "modal.enterName": "Digite o nome",

  // Chat
  "chat.savedAsNote": "Salvo como {{path}}",
  "chat.chatDeleted": "Chat excluido",
  "chat.configGeminiCli": "Antigravity CLI",
  "chat.configGeminiCliDesc": "Ative o modo CLI e verifique se o Antigravity CLI esta funcionando",
  "chat.configClaudeCli": "Claude CLI",
  "chat.configClaudeCliDesc": "Ative o modo CLI e verifique se o Claude CLI esta funcionando",
  "chat.configLocalLlm": "LLM local",
  "chat.configLocalLlmDesc": "Conectar a um servidor LLM local (Ollama, LM Studio, etc.)",
  "chat.rateLimitPaid": "Este modelo pode estar com limite de taxa. Tente outro modelo ate amanha.",
  "chat.errorOccurred": "Desculpe, ocorreu um erro: {{message}}",
  "chat.unknownError": "Erro desconhecido",
  "chat.localLlmNotConfigured": "A entrada de LLM local selecionada não está configurada. Escolha outro modelo ou adicione um nas configurações.",
  "chat.compactNotAvailable": "Comprimir não está disponível no modo CLI",
  "chat.yesterday": "Ontem",

  // InputArea
  "input.ragPdfChunkPages": "Páginas PDF por fragmento",
  "input.thinkingLabel": "Pensar sempre",

  // MessageBubble
  // Diff viewer
  "diff.restoreSize": "Restaurar tamanho",

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
  "editHistoryModal.confirmClearWithRemote": "Restaurar ao estado remoto e limpar histórico?",

  // Diff Modal

  // Edit History Buttons
  "editHistoryModal.showRemote": "Mostrar remoto",
  "editHistoryModal.loadingRemote": "Carregando...",
  "editHistoryModal.originLocal": "Local",
  "editHistoryModal.originRemote": "Remoto",

  // Status bar

  // Commands

  // Workflow Selector Modal

  // Errors

  // Encryption
  "settings.encryption": "Criptografia",
  "settings.encryptChatHistory": "Criptografar historico de chat com IA",
  "settings.encryptChatHistory.desc": "Criptografar arquivos de historico de chat com IA. Requer senha para visualizar o conteudo.",
  "settings.encryptWorkflowHistory": "Criptografar logs de execucao de workflows",
  "settings.encryptWorkflowHistory.desc": "Criptografar arquivos de logs de execucao de workflows. Requer senha para visualizar o conteudo.",
  "settings.encryptionSetup": "Configurar criptografia",
  "settings.encryptionSetup.desc": "Gerar chaves de criptografia. Voce pode criptografar sem senha, mas precisa de senha para descriptografar.",
  "settings.encryptionSetupBtn": "Configurar chaves de criptografia",
  "settings.encryptionPassword": "Senha de criptografia",
  "settings.encryptionPassword.desc": "Senha para proteger a chave privada. Necessaria para descriptografia.",
  "settings.encryptionPassword.placeholder": "Digite a senha",
  "settings.encryptionConfirmPassword": "Confirmar senha",
  "settings.encryptionConfirmPassword.placeholder": "Confirmar senha",
  "settings.encryptionPasswordMismatch": "As senhas nao coincidem",
  "settings.encryptionSetupSuccess": "Chaves de criptografia geradas com sucesso",
  "settings.encryptionSetupFailed": "Falha ao configurar criptografia: {{error}}",
  "settings.encryptionConfigured": "Criptografia configurada",
  "settings.encryptionConfigured.desc": "As chaves de criptografia estao configuradas. Escolha quais logs criptografar abaixo.",
  "settings.encryptionResetKeys": "Redefinir chaves de criptografia",
  "settings.encryptionResetKeys.desc": "Gerar novas chaves de criptografia. Chats criptografados anteriores nao serao legiveis.",
  "settings.encryptionResetKeysConfirm": "Redefinir chaves de criptografia? Todo historico de chat criptografado anteriormente ficara ilegivel.",
  "settings.encryptionKeysReset": "As chaves de criptografia foram redefinidas",

  // Decryption
  "chat.encryptedChat": "Chat criptografado",
  "chat.decryptFailed": "Falha na descriptografia. Verifique sua senha.",
  "chat.decrypted": "Descriptografado com sucesso",

  // Workflow Generation Modal
  "workflow.generation.generatingWithCli": "Gerando com {{cli}}",

  // Workflow Preview Modal

  // Workflow Confirm Modal

  // Execution History Select Modal

  // Workflow Execution Modal

  // CryptView - File Encryption

  // MCP Server Settings
  "settings.mcpTransport": "Transporte",
  "settings.mcpTransport.http": "HTTP (Streamable HTTP)",
  "settings.mcpTransport.stdio": "Stdio (processo local)",
  "settings.mcpTransport.stdioDesktopOnly": "O transporte Stdio so esta disponivel no desktop",
  "settings.mcpServerCommand": "Comando",
  "settings.mcpServerCommand.placeholder": "npx, uvx ou /caminho/para/servidor",
  "settings.mcpServerArgs": "Argumentos",
  "settings.mcpServerArgs.placeholder": "-y @modelcontextprotocol/server-name",
  "settings.mcpServerFraming": "Protocolo de enquadramento",
  "settings.mcpServerFraming.contentLength": "Content-Length (servidores TypeScript/npx)",
  "settings.mcpServerFraming.newline": "Delimitado por nova linha (servidores Python/uvx)",
  "settings.mcpServerEnv": "Variaveis de ambiente (JSON)",
  "settings.mcpServerEnv.placeholder": "{\"API_KEY\": \"xxx\"}",
  "settings.mcpServerEnv.desc": "Variaveis de ambiente opcionais para o processo do servidor (formato JSON)",
  "settings.mcpServerCommandRequired": "O comando e obrigatorio para o transporte Stdio",
  "settings.mcpServerInvalidEnv": "JSON invalido para variaveis de ambiente",

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
  "settings.discord": "Integracao Discord",
  "settings.discordEnabled": "Ativar bot do Discord",
  "settings.discordEnabled.desc": "Iniciar o bot do Discord quando o plugin carregar",
  "settings.discordBotToken": "Token do bot",
  "settings.discordBotToken.desc": "Token do bot Discord do Developer Portal (Bot → Token)",
  "settings.discordBotToken.placeholder": "Insira o token do seu bot Discord",
  "settings.discordConnection": "Conexao",
  "settings.discordConnection.desc": "Conectar ou desconectar o bot Discord",
  "settings.discordConnect": "Conectar",
  "settings.discordDisconnect": "Desconectar",
  "settings.discordVerifying": "Verificando...",
  "settings.discordStatusConnected": "O bot esta conectado",
  "settings.discordStatusDisconnected": "O bot nao esta conectado",
  "settings.discordDisconnected": "Bot Discord desconectado",
  "settings.discordVerifyFailed": "Falha na verificacao do token Discord: {{error}}",
  "settings.discordStartFailed": "Falha ao iniciar o bot Discord: {{error}}",
  "settings.discordRespondToDMs": "Responder a DMs",
  "settings.discordRespondToDMs.desc": "Se o bot responde a mensagens diretas",
  "settings.discordRequireMention": "Exigir @mention em canais",
  "settings.discordRequireMention.desc": "Quando ativado, o bot so responde quando mencionado em canais do servidor",
  "settings.discordAllowedChannels": "IDs de canais permitidos",
  "settings.discordAllowedChannels.desc": "IDs de canais Discord separados por virgula. Deixe vazio para permitir todos os canais.",
  "settings.discordAllowedChannels.placeholder": "123456789,987654321",
  "settings.discordAllowedUsers": "IDs de usuarios permitidos",
  "settings.discordAllowedUsers.desc": "IDs de usuarios Discord separados por virgula. Deixe vazio para permitir todos os usuarios.",
  "settings.discordAllowedUsers.placeholder": "123456789,987654321",
  "settings.discordModel": "Modelo",
  "settings.discordModel.desc": "Modelo a usar para respostas do Discord (ex: api:provider_id:model_name). Deixe vazio para usar o modelo atualmente selecionado.",
  "settings.discordModel.placeholder": "Usar modelo atual",
  "settings.discordSystemPrompt": "System prompt",
  "settings.discordSystemPrompt.desc": "System prompt personalizado para respostas do Discord. Deixe vazio para usar o padrao.",
  "settings.discordSystemPrompt.placeholder": "Voce e um assistente util no Discord...",
  "settings.discordMaxResponseLength": "Comprimento maximo da resposta",
  "settings.discordMaxResponseLength.desc": "Maximo de caracteres por mensagem Discord (limite do Discord: 2000)",

  // Search tab
  "search.discussWithSelected": "Discutir com selecionados",
  "search.pdfMode": "Resultados PDF",
  "search.helpTitle": "Ajuda de parametros",
  "search.helpTopK": "Top K — Numero maximo de resultados a retornar.",
  "search.helpScoreThreshold": "Pontuacao minima — Pontuacao de similaridade minima (0.0–1.0). Resultados abaixo sao excluidos.",
  "search.helpExt": "Ext. — Extensoes de arquivo separadas por virgulas para filtrar (ex. md, pdf). Vazio = todos os arquivos.",
  "search.helpChunkSize": "Tamanho do fragmento — Numero de caracteres por fragmento de texto ao indexar. Fragmentos maiores retêm mais contexto, mas podem reduzir a precisão.",
  "search.helpChunkOverlap": "Sobreposição de fragmentos — Numero de caracteres sobrepostos entre fragmentos adjacentes. Ajuda a preservar o contexto nos limites.",
  "search.helpPdfChunkPages": "Paginas por fragmento PDF — Numero de paginas agrupadas em um fragmento ao indexar PDFs.",

  // RAG source modal

  // LLM vault tool folders
  "settings.cloudVaultToolAllowedFolders": "Pastas das ferramentas de cofre do LLM",
  "settings.cloudVaultToolAllowedFolders.desc": "Pastas separadas por vírgulas que as ferramentas de cofre do LLM e os workflows de skills acionados pelo LLM podem acessar. Deixe vazio para permitir todo o cofre. Isso não limita o RAG, anexos manuais, menções @note, ferramentas MCP, scripts ou comandos de shell.",
  "settings.cloudVaultToolAllowedFolders.placeholder": "Exemplo: Public, Shared/Docs",

};
