# LLM Hub para Obsidian

[![DeepWiki](https://img.shields.io/badge/DeepWiki-takeshy%2Fobsidian--llm--hub-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTloMTZhMiAyIDAgMCAwIDItMlY3YTIgMiAwIDAgMC0yLTJINWEyIDIgMCAwIDAtMiAydjEyYTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTkgMTV2LTQiLz48cGF0aCBkPSJNMTIgMTV2LTIiLz48cGF0aCBkPSJNMTUgMTV2LTQiLz48L3N2Zz4=)](https://deepwiki.com/takeshy/obsidian-llm-hub)

Assistente de IA **gratuito e open-source** para Obsidian com **Chat**, **Automacao de Workflows** e **Busca Semantica (RAG)**. Suporta multiplos provedores de LLM — use a IA que melhor atende as suas necessidades.

> **Use qualquer provedor de LLM:** [Gemini](https://ai.google.dev), [OpenAI](https://platform.openai.com), [Anthropic](https://console.anthropic.com), [OpenRouter](https://openrouter.ai), [Grok](https://console.x.ai), LLMs locais ([Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), [vLLM](https://docs.vllm.ai)), ou ferramentas CLI ([Gemini CLI](https://github.com/google-gemini/gemini-cli), [Claude Code](https://github.com/anthropics/claude-code), [Codex CLI](https://github.com/openai/codex)).

## Destaques

- **Chat LLM Multi-Provedor** - Use Gemini, OpenAI, Anthropic, OpenRouter, Grok, LLMs locais ou backends CLI
- **Operacoes no Vault** - A IA le, escreve, pesquisa e edita suas notas com chamada de funcoes (Gemini, OpenAI, Anthropic)
- **Construtor de Workflows** - Automatize tarefas de multiplas etapas com editor visual de nos e 25 tipos de nos
- **Busca Semantica (RAG)** - Busca vetorial local com aba de busca dedicada, pre-visualizacao de PDF e fluxo de resultados para o chat
- **AI Discussion** - Arena de debate multi-modelo com respostas paralelas, votacao e determinacao do vencedor
- **Historico de Edicoes** - Rastreie e restaure alteracoes feitas pela IA com visualizacao de diff
- **Busca na Web** - Acesse informacoes atualizadas via Google Search (Gemini)
- **Geracao de Imagens** - Crie imagens com Gemini ou DALL-E
- **Integracao com Discord** - Conecte seu LLM ao Discord como chat bot com troca de modelo/RAG por canal
- **Criptografia** - Proteja com senha o historico de chat e logs de execucao de workflows


## Provedores Suportados

| Provedor | Chat | Ferramentas do Vault | Web Search | Geracao de Imagens | RAG |
|----------|------|----------------------|------------|---------------------|-----|
| **Gemini** (API) | ✅ Streaming | ✅ Function calling | ✅ Google Search | ✅ Modelos de imagem Gemini | ✅ |
| **OpenAI** (API) | ✅ Streaming | ✅ Function calling | ❌ | ✅ DALL-E | ✅ |
| **Anthropic** (API) | ✅ Streaming | ✅ Tool use | ❌ | ❌ | ✅ |
| **OpenRouter** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **Grok** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **Local LLM** (Ollama, LM Studio, vLLM) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |
| **CLI** (Gemini, Claude, Codex) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |

> [!TIP]
> **Multiplos provedores podem ser configurados simultaneamente.** Alterne entre modelos livremente durante o chat — cada provedor tem sua propria chave de API e configuracoes.

> [!TIP]
> **Opcoes de CLI** permitem usar modelos principais apenas com uma conta - sem necessidade de chave de API!
> - **Gemini CLI**: Instale o [Gemini CLI](https://github.com/google-gemini/gemini-cli), execute `gemini` e autentique com `/auth`
> - **Claude CLI**: Instale o [Claude Code](https://github.com/anthropics/claude-code) (`npm install -g @anthropic-ai/claude-code`), execute `claude` e autentique
> - **Codex CLI**: Instale o [Codex CLI](https://github.com/openai/codex) (`npm install -g @openai/codex`), execute `codex` e autentique

### Dicas para Chave de API Gratuita do Gemini

- **Limites de taxa** sao por modelo e reiniciam diariamente. Troque de modelo para continuar trabalhando.
- **Gemma 4** nao pode combinar chamadas de funcao com RAG/Web Search em uma unica solicitacao. Quando RAG ou Web Search esta ativo, as ferramentas do vault sao automaticamente desabilitadas. **Modelos CLI** e **LLMs locais** nao suportam operacoes no vault, mas **Workflows ainda podem ler/escrever notas** usando os tipos de no `note`, `note-read` e outros. As variaveis `{content}` e `{selection}` tambem funcionam.

---

# Chat com IA

O recurso de Chat com IA fornece uma interface de conversacao interativa com o provedor de LLM escolhido, integrada ao seu vault do Obsidian.

![Interface do Chat](docs/images/chat.png)

**Abrindo o Chat:**
- Clique no icone do LLM Hub na ribbon
- Comando: "LLM Hub: Open chat"
- Alternar: "LLM Hub: Toggle chat / editor"

**Controles do Chat:**
- **Enter** - Enviar mensagem
- **Shift+Enter** - Nova linha
- **Botao Stop** - Parar geracao
- **Botao +** - Novo chat
- **Botao History** - Carregar chats anteriores

## Comandos de Barra

Crie templates de prompts reutilizaveis acionados por `/`:

- Defina templates com `{selection}` (texto selecionado) e `{content}` (nota ativa)
- Modelo opcional e substituicao de busca por comando
- Digite `/` para ver os comandos disponiveis

**Padrao:** `/infographic` - Converte conteudo em infografico HTML

![Exemplo de Infografico](docs/images/chat_infographic.png)

## Mencoes com @

Referencie arquivos e variaveis digitando `@`:

- `{selection}` - Texto selecionado
- `{content}` - Conteudo da nota ativa
- Qualquer arquivo do vault - Navegue e insira (somente caminho; a IA le o conteudo via ferramentas)

> [!NOTE]
> **Como `{selection}` e `{content}` funcionam:** Quando voce muda da Visualizacao Markdown para a Visualizacao de Chat, a selecao normalmente seria apagada devido a mudanca de foco. Para preservar sua selecao, o plugin a captura ao mudar de visualizacao e destaca a area selecionada com uma cor de fundo na Visualizacao Markdown. A opcao `{selection}` so aparece nas sugestoes @ quando ha texto selecionado.
>
> Tanto `{selection}` quanto `{content}` **nao sao expandidos** intencionalmente na area de entrada—como a entrada do chat e compacta, expandir texto longo dificultaria a digitacao. O conteudo e expandido quando voce envia a mensagem, o que pode ser verificado conferindo sua mensagem enviada no chat.

> [!NOTE]
> Mencoes de arquivos do vault com @ inserem apenas o caminho do arquivo - a IA le o conteudo via ferramentas. Isso nao funciona com modelos CLI ou LLMs locais (sem suporte a ferramentas do vault). O Gemini CLI pode ler arquivos via shell, mas o formato da resposta pode diferir.

## Anexos de Arquivos

Anexe arquivos diretamente: Imagens (PNG, JPEG, GIF, WebP), PDFs, Arquivos de texto

## Chamada de Funcoes (Operacoes no Vault)

A IA pode interagir com seu vault usando estas ferramentas:

| Ferramenta | Descricao |
|------------|-----------|
| `read_note` | Ler conteudo de nota |
| `create_note` | Criar novas notas |
| `propose_edit` | Editar com dialogo de confirmacao |
| `propose_delete` | Excluir com dialogo de confirmacao |
| `bulk_propose_edit` | Editar multiplos arquivos em massa com dialogo de selecao |
| `bulk_propose_delete` | Excluir multiplos arquivos em massa com dialogo de selecao |
| `search_notes` | Buscar no vault por nome ou conteudo |
| `list_notes` | Listar notas em pasta |
| `rename_note` | Renomear/mover notas |
| `create_folder` | Criar novas pastas |
| `list_folders` | Listar pastas no vault |
| `get_active_note_info` | Obter informacoes sobre nota ativa |
| `bulk_propose_rename` | Renomear em massa multiplos arquivos com dialogo de selecao |

### Modo de Ferramentas do Vault

Quando a IA manipula notas no Chat, ela usa ferramentas do Vault. Controle quais ferramentas do vault a IA pode usar atraves do icone de banco de dados (📦) abaixo do botao de anexo:

| Modo | Descricao | Ferramentas Disponiveis |
|------|-----------|------------------------|
| **Vault: Tudo** | Acesso completo ao vault | Todas as ferramentas |
| **Vault: Sem pesquisa** | Excluir ferramentas de pesquisa | Todas exceto `search_notes`, `list_notes` |
| **Vault: Desligado** | Sem acesso ao vault | Nenhuma |

**Quando usar cada modo:**

- **Vault: Tudo** - Modo padrao para uso geral. A IA pode ler, escrever e pesquisar em seu vault.
- **Vault: Sem pesquisa** - Use quando ja souber o arquivo alvo. Isso evita pesquisas redundantes no vault, economizando tokens e melhorando o tempo de resposta.
- **Vault: Desligado** - Use quando nao precisar de acesso ao vault.

**Selecao automatica de modo:**

| Condicao | Modo Padrao | Alteravel |
|----------|-------------|-----------|
| Modelos CLI (Gemini/Claude/Codex CLI) | Vault: Desligado | Nao |
| LLM Local | Vault: Desligado | Nao |
| Gemma 4 + RAG/Web Search | Vault: Desligado | Sim (desabilitar RAG/Web Search reativa as ferramentas) |
| Normal | Vault: Tudo | Sim |

**Por que alguns modos sao forcados:**

- **Modelos CLI/LLM Local**: Esses modelos nao suportam chamadas de funcao, entao as ferramentas do Vault nao podem ser usadas.
- **Gemma 4**: Chamadas de funcao e RAG/Web Search nao podem ser combinados em uma unica solicitacao. Quando um esta ativo, o outro e automaticamente desabilitado.

## Edicao Segura

Quando a IA usa `propose_edit`:
1. Um dialogo de confirmacao mostra as alteracoes propostas
2. Clique em **Apply** para gravar as alteracoes no arquivo
3. Clique em **Discard** para cancelar sem modificar o arquivo

> As alteracoes NAO sao gravadas ate voce confirmar.

## Historico de Edicoes

Rastreie e restaure alteracoes feitas em suas notas:

- **Rastreamento automatico** - Todas as edicoes de IA (chat, workflow) e alteracoes manuais sao registradas
- **Acesso pelo menu de arquivo** - Clique com o botao direito em um arquivo markdown para acessar:
  - **Snapshot** - Salvar o estado atual como snapshot
  - **History** - Abrir modal de historico de edicoes


- **Paleta de comandos** - Tambem disponivel via comando "Show edit history"
- **Visualizacao de diff** - Veja exatamente o que mudou com adicoes/exclusoes coloridas
- **Restaurar** - Reverta para qualquer versao anterior com um clique
- **Copiar** - Salva uma versao historica como um novo arquivo (nome padrao: `{filename}_{datetime}.md`)
- **Modal redimensionavel** - Arraste para mover, redimensione pelos cantos

**Exibicao de diff:**
- Linhas `+` existiam na versao anterior
- Linhas `-` foram adicionadas na versao mais nova

**Como funciona:**

O historico de edicoes usa uma abordagem baseada em snapshots:

1. **Criacao do snapshot** - Quando um arquivo e aberto pela primeira vez ou modificado pela IA, um snapshot de seu conteudo e salvo
2. **Registro de diff** - Quando o arquivo e modificado, a diferenca entre o novo conteudo e o snapshot e registrada como uma entrada de historico
3. **Atualizacao do snapshot** - O snapshot e atualizado para o novo conteudo apos cada modificacao
4. **Restaurar** - Para restaurar para uma versao anterior, os diffs sao aplicados em reverso a partir do snapshot

**Quando o historico e registrado:**
- Edicoes de chat da IA (ferramenta `propose_edit`)
- Modificacoes de notas de workflow (no `note`)
- Salvamentos manuais via comando
- Auto-deteccao quando o arquivo difere do snapshot ao abrir

**Armazenamento:** O historico de edicao e armazenado em memoria e limpo ao reiniciar o Obsidian. O rastreamento persistente de versoes e coberto pela recuperacao de arquivos integrada do Obsidian.

![Modal de Historico de Edicoes](docs/images/edit_history.png)

## Servidores MCP

Os servidores MCP (Model Context Protocol) fornecem ferramentas adicionais que estendem as capacidades da IA alem das operacoes do vault.

**Dois modos de transporte sao suportados:**

**HTTP (Streamable HTTP):**

1. Abra as configuracoes do plugin → secao **MCP Servers**
2. Clique em **Add server** → selecione **HTTP**
3. Digite o nome e URL do servidor
4. Configure cabecalhos opcionais (formato JSON) para autenticacao
5. Clique em **Test connection** para verificar e obter as ferramentas disponiveis
6. Salve a configuracao do servidor

**Stdio (Processo local):**

1. Abra as configuracoes do plugin → secao **MCP Servers**
2. Clique em **Add server** → selecione **Stdio**
3. Digite o nome do servidor e o comando (ex.: `npx -y @modelcontextprotocol/server-filesystem /path/to/dir`)
4. Configure variaveis de ambiente opcionais (formato JSON)
5. Clique em **Test connection** para verificar e obter as ferramentas disponiveis
6. Salve a configuracao do servidor

> **Nota:** O transporte Stdio inicia um processo local e funciona somente no desktop. O teste de conexao e obrigatorio antes de salvar.

![Configuracoes de Servidores MCP](docs/images/setting_mcp.png)

**Usando ferramentas MCP:**

- **No chat:** Clique no icone de banco de dados (📦) para abrir as configuracoes de ferramentas. Ative/desative servidores MCP por conversa.
- **Em workflows:** Use o no `mcp` para chamar ferramentas do servidor MCP.

**Dicas de ferramentas:** Apos um teste de conexao bem-sucedido, os nomes das ferramentas disponiveis sao salvos e exibidos tanto nas configuracoes quanto na interface do chat.

### MCP Apps (UI Interativa)

Algumas ferramentas MCP retornam UI interativa que permite interagir visualmente com os resultados da ferramenta. Este recurso e baseado na [especificacao MCP Apps](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/mcp_apps).


**Como funciona:**

- Quando uma ferramenta MCP retorna um URI de recurso `ui://` nos metadados de resposta, o plugin busca e renderiza o conteudo HTML
- A UI e exibida em um iframe sandboxed por seguranca (`sandbox="allow-scripts allow-forms"`)
- Aplicativos interativos podem chamar ferramentas MCP adicionais e atualizar o contexto atraves de uma ponte JSON-RPC

**No Chat:**
- MCP Apps aparece inline nas mensagens do assistente com um botao expandir/recolher
- Clique em ⊕ para expandir para tela cheia, ⊖ para recolher

**Em Workflows:**
- MCP Apps e exibido em um dialogo modal durante a execucao do workflow
- O workflow pausa para permitir a interacao do usuario, depois continua quando o modal e fechado

> **Seguranca:** Todo o conteudo MCP App e executado em um iframe sandboxed com permissoes restritas. O iframe nao pode acessar o DOM da pagina pai, cookies ou armazenamento local. Apenas `allow-scripts` e `allow-forms` estao habilitados.

## Skills de Agente

Estenda as capacidades da IA com instrucoes personalizadas, materiais de referencia e fluxos de trabalho executaveis. Os skills seguem o padrao da industria para skills de agente (ex. [OpenAI Codex](https://github.com/openai/codex) `.codex/skills/`).

- **Instrucoes personalizadas** - Defina comportamento especifico do dominio atraves de arquivos `SKILL.md`
- **Materiais de referencia** - Inclua guias de estilo, modelos e checklists em `references/`
- **Integracao com fluxos de trabalho** - Skills podem expor fluxos de trabalho como ferramentas de Function Calling
- **Comando slash** - Digite `/folder-name` para invocar um skill instantaneamente e enviar
- **Suporte modo CLI** - Os skills funcionam com os backends Gemini CLI, Claude CLI e Codex CLI
- **Ativacao seletiva** - Escolha quais skills estao ativos por conversa

Crie skills da mesma forma que workflows — selecione **+ New (AI)**, marque **"Criar como agent skill"** e descreva o que deseja. A AI gera tanto as instrucoes do `SKILL.md` quanto o workflow.

> **Para instrucoes de configuracao e exemplos, consulte [SKILLS.md](docs/SKILLS_pt.md)**

---

# Integracao com Discord

Conecte o LLM do seu vault Obsidian ao Discord como chat bot. Os usuarios podem conversar com a IA, trocar de modelo, usar busca RAG e ativar comandos de barra — tudo pelo Discord.

## Configuracao

### 1. Criar um Bot no Discord

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em **New Application** → insira um nome → **Create**
3. Va em **Bot** na barra lateral esquerda
4. Clique em **Reset Token** → copie o token do bot (voce precisara dele depois)
5. Em **Privileged Gateway Intents**, habilite **Message Content Intent** (necessario para ler o texto das mensagens)

### 2. Convidar o Bot para Seu Servidor

1. Va em **OAuth2** na barra lateral esquerda
2. Em **OAuth2 URL Generator**, selecione o escopo **bot**
3. Em **Bot Permissions**, selecione:
   - **Send Messages**
   - **Read Message History**
4. Copie a URL gerada e abra no seu navegador
5. Selecione um servidor e autorize o bot

### 3. Configurar no Obsidian

1. Abra as configuracoes do plugin → secao **Discord**
2. Habilite **Discord Bot**
3. Cole o token do bot
4. Clique em **Connect** (o plugin verifica o token antes de conectar)
5. O indicador de status mostra se o bot esta conectado

## Opcoes de Configuracao

| Configuracao | Descricao | Padrao |
|--------------|-----------|--------|
| **Enabled** | Ativar/desativar o bot Discord | Desativado |
| **Bot Token** | Token do bot Discord do Developer Portal | — |
| **Respond to DMs** | Se o bot responde a mensagens diretas | Ativado |
| **Require @mention** | Em canais do servidor, responder apenas quando @mencionado (DMs sempre respondem) | Ativado |
| **Allowed Channel IDs** | IDs de canais separados por virgula para restringir (vazio = todos os canais) | vazio |
| **Allowed User IDs** | IDs de usuarios separados por virgula para restringir (vazio = todos os usuarios) | vazio |
| **Model Override** | Especificar qual modelo usar no Discord (vazio = modelo selecionado atual) | vazio |
| **System Prompt Override** | Prompt de sistema personalizado para conversas no Discord | vazio |
| **Max Response Length** | Maximo de caracteres por mensagem (1–2000, limite do Discord) | 2000 |

> [!TIP]
> **Encontrando IDs de Canal/Usuario:** No Discord, habilite o **Developer Mode** (Configuracoes → Avancado → Developer Mode). Depois clique com o botao direito em um canal ou usuario e selecione **Copy ID**.

## Comandos do Bot

Os usuarios podem interagir com o bot usando estes comandos no Discord:

| Comando | Descricao |
|---------|-----------|
| `!model` | Listar modelos disponiveis |
| `!model <nome>` | Trocar para um modelo especifico neste canal |
| `!rag` | Listar configuracoes RAG disponiveis |
| `!rag <nome>` | Trocar para uma configuracao RAG especifica neste canal |
| `!rag off` | Desativar RAG neste canal |
| `!skill` | Listar comandos de barra disponiveis |
| `!skill <nome>` | Ativar um comando de barra (pode exigir mensagem de acompanhamento) |
| `!discuss <theme>` | Iniciar AI Discussion com participantes configurados (em segundo plano) |
| `!reset` | Limpar historico de conversa deste canal |
| `!help` | Mostrar mensagem de ajuda |

## Funcionalidades

- **Suporte multi-provedor** — Funciona com todos os provedores de LLM configurados (Gemini, OpenAI, Anthropic, OpenRouter, Grok, CLI, Local LLM)
- **Estado por canal** — Cada canal do Discord mantem seu proprio historico de conversa, selecao de modelo e configuracao RAG
- **Ferramentas do vault** — A IA tem acesso completo as ferramentas do vault (ler, escrever, pesquisar notas) com base nas configuracoes do plugin
- **Integracao RAG** — A busca semantica pode ser habilitada por canal via comando `!rag`
- **Comandos de barra** — Ative comandos de barra do plugin via `!skill`
- **Divisao de mensagens longas** — Respostas que excedem o limite de 2000 caracteres do Discord sao automaticamente divididas em pontos de quebra naturais
- **Memoria de conversa** — Historico por canal (maximo 20 mensagens, TTL de 30 minutos)
- **Reconexao automatica** — Recupera de quedas de conexao com backoff exponencial

> [!NOTE]
> O historico de conversa e mantido apenas em memoria e e apagado quando o bot desconecta ou o Obsidian reinicia.

---

# Construtor de Workflows

Construa workflows automatizados de multiplas etapas diretamente em arquivos Markdown. **Nao e necessario conhecimento de programacao** - apenas descreva o que voce quer em linguagem natural, e a IA criara o workflow para voce.

![Editor Visual de Workflows](docs/images/visual_workflow.png)

## Criacao de Workflows e Skills com AI

**Voce nao precisa aprender sintaxe YAML ou tipos de nos.** Simplesmente descreva seu workflow em linguagem simples:

1. Abra a aba **Workflow** na barra lateral do LLM Hub
2. Selecione **+ New (AI)** no menu dropdown
3. Descreva o que voce quer: *"Crie um workflow que resuma a nota selecionada e salve em uma pasta de resumos"*
4. Marque **"Criar como agent skill"** se deseja criar um agent skill em vez de um workflow independente
5. Clique em **Generate** - a IA cria o workflow completo

![Criar Workflow com IA](docs/images/create_workflow_with_ai.png)

**Modifique workflows existentes da mesma forma:**
1. Carregue qualquer workflow
2. Clique no botao **AI Modify**
3. Descreva as alteracoes: *"Adicione uma etapa para traduzir o resumo para japones"*
4. Revise e aplique


## Tipos de Nos Disponiveis

24 tipos de nos estao disponiveis para construcao de workflows:

| Categoria | Nos |
|-----------|-----|
| Variaveis | `variable`, `set` |
| Controle | `if`, `while` |
| LLM | `command` |
| Dados | `http`, `json`, `script` |
| Notas | `note`, `note-read`, `note-search`, `note-list`, `folder-list`, `open` |
| Arquivos | `file-explorer`, `file-save` |
| Prompts | `prompt-file`, `prompt-selection`, `dialog` |
| Composicao | `workflow` |
| Externo | `mcp`, `obsidian-command` |
| Utilitario | `sleep` |

> **Para especificacoes detalhadas de nos e exemplos, veja [WORKFLOW_NODES_pt.md](docs/WORKFLOW_NODES_pt.md)**

## Modo de Atalho

Atribua atalhos de teclado para executar workflows instantaneamente:

1. Adicione um campo `name:` ao seu workflow
2. Abra o arquivo de workflow e selecione o workflow no dropdown
3. Clique no icone de teclado (⌨️) no rodape do painel Workflow
4. Va para Settings → Hotkeys → pesquise "Workflow: [Nome do Seu Workflow]"
5. Atribua um atalho (ex.: `Ctrl+Shift+T`)

Quando acionado por atalho:
- `prompt-file` usa o arquivo ativo automaticamente (sem dialogo)
- `prompt-selection` usa a selecao atual, ou o conteudo completo do arquivo se nao houver selecao

## Gatilhos de Eventos

Workflows podem ser acionados automaticamente por eventos do Obsidian:

![Configuracoes de Gatilho de Evento](docs/images/event_setting.png)

| Evento | Descricao |
|--------|-----------|
| File Created | Acionado quando um novo arquivo e criado |
| File Modified | Acionado quando um arquivo e salvo (debounce de 5s) |
| File Deleted | Acionado quando um arquivo e excluido |
| File Renamed | Acionado quando um arquivo e renomeado |
| File Opened | Acionado quando um arquivo e aberto |

**Configuracao de gatilho de evento:**
1. Adicione um campo `name:` ao seu workflow
2. Abra o arquivo de workflow e selecione o workflow no dropdown
3. Clique no icone de raio (⚡) no rodape do painel Workflow
4. Selecione quais eventos devem acionar o workflow
5. Opcionalmente adicione um filtro de padrao de arquivo

**Exemplos de padrao de arquivo:**
- `**/*.md` - Todos os arquivos Markdown em qualquer pasta
- `journal/*.md` - Arquivos Markdown somente na pasta journal
- `*.md` - Arquivos Markdown somente na pasta raiz
- `**/{daily,weekly}/*.md` - Arquivos nas pastas daily ou weekly
- `projects/[a-z]*.md` - Arquivos comecando com letra minuscula

**Variaveis de evento:** Quando acionado por um evento, estas variaveis sao definidas automaticamente:

| Variavel | Descricao |
|----------|-----------|
| `_eventType` | Tipo de evento: `create`, `modify`, `delete`, `rename`, `file-open` |
| `_eventFilePath` | Caminho do arquivo afetado |
| `_eventFile` | JSON com informacoes do arquivo (path, basename, name, extension) |
| `_eventFileContent` | Conteudo do arquivo (para eventos create/modify/file-open) |
| `_eventOldPath` | Caminho anterior (somente para eventos rename) |

> **Nota:** Os nos `prompt-file` e `prompt-selection` usam automaticamente o arquivo do evento quando acionados por eventos. `prompt-selection` usa o conteudo inteiro do arquivo como selecao.

---

# Comum

## Modelos Suportados

### Gemini

| Modelo | Descricao |
|--------|-----------|
| Gemini 3.1 Pro Preview | Ultimo modelo principal, contexto 1M (recomendado) |
| Gemini 3.1 Pro Preview (Custom Tools) | Otimizado para fluxos de trabalho agenticos com ferramentas personalizadas e bash |
| Gemini 3 Flash Preview | Modelo rapido, contexto 1M, melhor custo-beneficio |
| Gemini 3.1 Flash Lite Preview | Modelo mais economico com alto desempenho |
| Gemini 2.5 Flash | Modelo rapido, contexto 1M |
| Gemini 2.5 Pro | Modelo Pro, contexto 1M |
| Gemini 3 Pro (Image) | Geracao de imagens Pro, 4K |
| Gemini 3.1 Flash (Image) | Geracao de imagens rapida e economica |
| Gemma 4 | Gratuito, chamadas de funcao e RAG/Web Search sao mutuamente exclusivos |

> **Modo Thinking:** No chat, o modo thinking e acionado por palavras-chave como "pense", "analise" ou "reflita" na sua mensagem. No entanto, **Gemini 3.1 Pro** sempre usa o modo thinking independentemente das palavras-chave — este modelo nao suporta a desativacao do thinking.

**Toggle Always Think:**

Voce pode forcar o modo thinking para os modelos Flash sem usar palavras-chave. Clique no icone de banco de dados (📦) para abrir o menu de ferramentas e marque os toggles em **Always Think**:

- **Flash** — Desativado por padrao. Marque para sempre habilitar o thinking nos modelos Flash.
- **Flash Lite** — Ativado por padrao. O Flash Lite tem diferenca minima de custo e velocidade com o thinking ativado, por isso e recomendado mante-lo ligado.

Quando um toggle esta ativado, o thinking esta sempre ativo para aquela familia de modelos, independentemente do conteudo da mensagem. Quando desativado, a deteccao existente baseada em palavras-chave e utilizada.

![Always Think Settings](docs/images/setting_thinking.png)

### OpenAI

| Modelo | Descricao |
|--------|-----------|
| GPT-5.4 | Ultimo modelo principal |
| GPT-5.4-mini | Modelo intermediario com bom custo-beneficio |
| GPT-5.4-nano | Modelo leve e rapido |
| O3 | Modelo de raciocinio |
| DALL-E 3 / DALL-E 2 | Geracao de imagens |

### Anthropic

| Modelo | Descricao |
|--------|-----------|
| Claude Opus 4.6 | Modelo mais capaz, pensamento estendido |
| Claude Sonnet 4.6 | Equilibrio entre desempenho e custo |
| Claude Haiku 4.5 | Modelo rapido e leve |

### OpenRouter / Grok / Custom

Configure qualquer endpoint compativel com OpenAI usando URL base e modelos personalizados. O OpenRouter fornece acesso a centenas de modelos de diversos provedores.

### Local LLM

Conecte-se a modelos executando localmente via Ollama, LM Studio, vLLM ou AnythingLLM. Os modelos sao detectados automaticamente a partir do servidor em execucao.

## Instalacao

### BRAT (Recomendado)
1. Instale o plugin [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Abra as configuracoes do BRAT → "Add Beta plugin"
3. Digite: `https://github.com/takeshy/obsidian-llm-hub`
4. Ative o plugin nas configuracoes de Community plugins

### Manual
1. Baixe `main.js`, `manifest.json`, `styles.css` das releases
2. Crie a pasta `llm-hub` em `.obsidian/plugins/`
3. Copie os arquivos e ative nas configuracoes do Obsidian

### A partir do Codigo-fonte
```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

## Configuracao

### Provedores de API

Adicione um ou mais provedores de API nas configuracoes do plugin. Cada provedor tem sua propria chave de API e selecao de modelos.

| Provedor | Obter Chave de API |
|----------|---------------------|
| Gemini | [ai.google.dev](https://ai.google.dev) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) |
| OpenRouter | [openrouter.ai](https://openrouter.ai) |
| Grok | [console.x.ai](https://console.x.ai) |

Voce tambem pode adicionar endpoints personalizados compativeis com OpenAI.

![Configuracoes Basicas](docs/images/setting_basic.png)

### Local LLM

Conecte-se a servidores LLM locais:

1. Inicie seu servidor local (Ollama, LM Studio, vLLM ou AnythingLLM)
2. Insira a URL do servidor nas configuracoes do plugin
3. Clique em "Verify" para detectar os modelos disponiveis

> [!NOTE]
> LLMs locais nao suportam chamada de funcoes (ferramentas do vault). Use workflows para operacoes com notas.

### Modo CLI (Gemini / Claude / Codex)

**Gemini CLI:**
1. Instale o [Gemini CLI](https://github.com/google-gemini/gemini-cli)
2. Autentique com `gemini` → `/auth`
3. Clique em "Verify" na secao Gemini CLI

**Claude CLI:**
1. Instale o [Claude Code](https://github.com/anthropics/claude-code): `npm install -g @anthropic-ai/claude-code`
2. Autentique com `claude`
3. Clique em "Verify" na secao Claude CLI

**Codex CLI:**
1. Instale o [Codex CLI](https://github.com/openai/codex): `npm install -g @openai/codex`
2. Autentique com `codex`
3. Clique em "Verify" na secao Codex CLI

**Limitacoes do CLI:** Sem suporte a ferramentas do vault, sem busca web, somente desktop

> [!NOTE]
> **Uso apenas com CLI:** Voce pode usar o modo CLI sem uma chave API. Basta instalar e verificar uma ferramenta CLI.

**Caminho CLI personalizado:** Se a deteccao automatica do CLI falhar, clique no icone de engrenagem (⚙️) ao lado do botao Verify para especificar manualmente o caminho do CLI. O plugin pesquisa automaticamente caminhos de instalacao comuns, incluindo gerenciadores de versao (nodenv, nvm, volta, fnm, asdf, mise).

<details>
<summary><b>Windows: Como encontrar o caminho do CLI</b></summary>

Deixe o campo de caminho do CLI vazio e clique em **Verify** — o plugin detecta automaticamente a instalacao npm-global (verifica `%APPDATA%\npm\node_modules`, `%PROGRAMFILES%\nodejs\node_modules` e os locais baseados em PATH) e executa o ponto de entrada `.js` real via `node`. A instalacao standalone do Claude em `%LOCALAPPDATA%\Programs\claude\claude.exe` tambem e detectada automaticamente.

Defina um caminho CLI personalizado apenas se a deteccao automatica falhar. Qualquer uma das opcoes a seguir funciona (da mais segura para a menos segura):

1. **Script `.js` (recomendado)** — ex. `C:\Users\YourName\AppData\Roaming\npm\node_modules\@google\gemini-cli\dist\index.js`. Executado via `node` (sem passar pelo `cmd.exe`).
2. **Executavel `.exe`** — ex. `C:\Users\YourName\AppData\Local\Programs\claude\claude.exe`. Executado diretamente.
3. **Wrapper `.cmd` / `.bat`** — ex. `C:\Users\YourName\AppData\Roaming\npm\gemini.cmd`. Precisa passar pelo `cmd.exe`, entao prompts com `&`, `|`, `>`, `^` ou `%VAR%` podem se comportar mal.

Use `Get-Command gemini` / `Get-Command claude` / `Get-Command codex` no PowerShell para encontrar o caminho do wrapper; insira-o diretamente (opcao 3) ou navegue para o `.js` / `.exe` adjacente para as opcoes mais seguras.
</details>

<details>
<summary><b>macOS / Linux: Como encontrar o caminho do CLI</b></summary>

1. Abra um terminal e execute:
   ```bash
   which gemini
   ```
2. Insira o caminho exibido (ex: `/home/user/.local/bin/gemini`) nas configuracoes de caminho do CLI

Para Claude CLI, use `which claude`. Para Codex CLI, use `which codex`.

**Gerenciadores de versao Node.js:** Se voce usa nodenv, nvm, volta, fnm, asdf ou mise, o plugin detecta automaticamente o binario do node em locais comuns. Se a deteccao falhar, especifique o caminho do script CLI diretamente (ex: `~/.npm-global/lib/node_modules/@google/gemini-cli/dist/index.js`).
</details>

> [!TIP]
> **Dica do Claude CLI:** As sessoes de chat do LLM Hub sao armazenadas localmente. Voce pode continuar conversas fora do Obsidian executando `claude --resume` no diretorio do seu vault para ver e retomar sessoes anteriores.

### Configuracoes de Workspace
- **Workspace Folder** - Localizacao do historico de chat e configuracoes
- **System Prompt** - Instrucoes adicionais para a IA
- **Tool Limits** - Controlar limites de chamadas de funcao
- **Edit History** - Rastrear e restaurar alteracoes feitas pela IA

![Limites de Ferramentas e Historico de Edicoes](docs/images/setting_tool_history.png)

### Criptografia

Proteja seu historico de chat e logs de execucao de workflows com senha separadamente.

**Configuracao:**

1. Defina uma senha nas configuracoes do plugin (armazenada com seguranca usando criptografia de chave publica)

![Configuracao Inicial de Criptografia](docs/images/setting_initial_encryption.png)

2. Apos a configuracao, ative a criptografia para cada tipo de log:
   - **Criptografar historico de chat AI** - Criptografa arquivos de conversa de chat
   - **Criptografar logs de execucao de workflows** - Criptografa arquivos de historico de workflows

![Configuracoes de Criptografia](docs/images/setting_encryption.png)

Cada configuracao pode ser habilitada/desabilitada independentemente.

**Recursos:**
- **Controles separados** - Escolha quais logs criptografar (chat, workflow, ou ambos)
- **Criptografia automatica** - Novos arquivos sao criptografados ao salvar com base nas configuracoes
- **Cache de senha** - Digite a senha uma vez por sessao
- **Visualizador dedicado** - Arquivos criptografados abrem em um editor seguro com pre-visualizacao
- **Opcao de descriptografia** - Remova a criptografia de arquivos individuais quando necessario

**Como funciona:**

```
[Configuracao - uma vez ao definir a senha]
Senha → Gerar par de chaves (RSA) → Criptografar chave privada → Armazenar nas configuracoes

[Criptografia - para cada arquivo]
Conteudo do arquivo → Criptografar com nova chave AES → Criptografar chave AES com chave publica
→ Salvar no arquivo: dados criptografados + chave privada criptografada (das configuracoes) + salt

[Descriptografia]
Senha + salt → Restaurar chave privada → Descriptografar chave AES → Descriptografar conteudo
```

- Par de chaves e gerado uma vez (geracao RSA e lenta), chave AES e gerada por arquivo
- Cada arquivo armazena: conteudo criptografado + chave privada criptografada (copiada das configuracoes) + salt
- Os arquivos sao autocontidos — descriptografaveis apenas com a senha, sem dependencia do plugin

<details>
<summary>Script Python de descriptografia (clique para expandir)</summary>

```python
#!/usr/bin/env python3
"""Descriptografar arquivos LLM Hub sem o plugin."""
import base64, sys, re, getpass
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import padding

def decrypt_file(filepath: str, password: str) -> str:
    with open(filepath, 'r') as f:
        content = f.read()

    match = re.match(r'^---\n([\s\S]*?)\n---\n([\s\S]*)$', content)
    if not match:
        raise ValueError("Formato de arquivo criptografado invalido")

    frontmatter, encrypted_data = match.groups()
    key_match = re.search(r'key:\s*(.+)', frontmatter)
    salt_match = re.search(r'salt:\s*(.+)', frontmatter)
    if not key_match or not salt_match:
        raise ValueError("Falta key ou salt no frontmatter")

    enc_private_key = base64.b64decode(key_match.group(1).strip())
    salt = base64.b64decode(salt_match.group(1).strip())
    data = base64.b64decode(encrypted_data.strip())

    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100000)
    derived_key = kdf.derive(password.encode())

    iv, enc_priv = enc_private_key[:12], enc_private_key[12:]
    private_key_pem = AESGCM(derived_key).decrypt(iv, enc_priv, None)
    private_key = serialization.load_der_private_key(base64.b64decode(private_key_pem), None)

    key_len = (data[0] << 8) | data[1]
    enc_aes_key = data[2:2+key_len]
    content_iv = data[2+key_len:2+key_len+12]
    enc_content = data[2+key_len+12:]

    aes_key = private_key.decrypt(enc_aes_key, padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))

    return AESGCM(aes_key).decrypt(content_iv, enc_content, None).decode('utf-8')

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Uso: {sys.argv[0]} <arquivo_criptografado>")
        sys.exit(1)
    password = getpass.getpass("Senha: ")
    print(decrypt_file(sys.argv[1], password))
```

Requer: `pip install cryptography`

</details>

> **Aviso:** Se voce esquecer sua senha, arquivos criptografados nao podem ser recuperados. Mantenha sua senha em seguranca.

> **Dica:** Para criptografar todos os arquivos em um diretorio de uma vez, use um workflow. Veja o exemplo "Criptografar todos os arquivos em um diretorio" em [WORKFLOW_NODES_pt.md](docs/WORKFLOW_NODES_pt.md#obsidian-command).

![Fluxo de Criptografia de Arquivos](docs/images/enc.png)

**Beneficios de seguranca:**
- **Protegido do chat com IA** - Arquivos criptografados nao podem ser lidos pelas operacoes de IA no vault (ferramenta `read_note`). Isso mantem dados sensiveis como chaves de API seguros contra exposicao acidental durante o chat.
- **Acesso via workflow com senha** - Workflows podem ler arquivos criptografados usando o no `note-read`. Quando acessado, um dialogo de senha aparece, e a senha e armazenada em cache para a sessao.
- **Armazene segredos com seguranca** - Em vez de escrever chaves de API diretamente nos workflows, armazene-as em arquivos criptografados. O workflow le a chave em tempo de execucao apos a verificacao da senha.

### Busca Semantica (RAG)

Busca local baseada em vetores que injeta conteudo relevante do vault nas conversas com LLM. Nenhum servidor RAG externo e necessario — os embeddings sao gerados e armazenados localmente.

**Configuracao:**

1. Va para Configuracoes → secao RAG
2. Crie uma nova configuracao RAG (clique em `+`)
3. Configure o embedding:
   - **Padrao (Gemini):** Deixe a URL Base de Embedding vazia — usa a API de Embedding do Gemini com sua chave de API do Gemini
   - **Servidor personalizado (Ollama etc.):** Defina a URL Base de Embedding e selecione um modelo
4. Clique em **Sync** para construir o indice vetorial a partir do seu vault
5. Selecione a configuracao RAG no dropdown para ativa-la

| Configuracao | Descricao | Padrao |
|--------------|-----------|--------|
| **Embedding Base URL** | URL do servidor de embedding personalizado (vazio = API Gemini) | vazio |
| **Embedding API Key** | Chave de API para servidor personalizado (vazio = chave Gemini) | vazio |
| **Embedding Model** | Nome do modelo para geracao de embedding | `gemini-embedding-2-preview` |
| **Chunk Size** | Caracteres por chunk | 500 |
| **Chunk Overlap** | Sobreposicao entre chunks | 100 |
| **Páginas PDF por fragmento** | Número de páginas PDF por fragmento de embedding (1–6) | 6 |
| **Top K** | Maximo de chunks recuperados por consulta | 5 |
| **Score Threshold** | Pontuacao minima de similaridade (0.0–1.0) para incluir nos resultados | 0.5 |
| **Target Folders** | Limitar indexacao a pastas especificas (vazio = todas) | vazio |
| **Exclude Patterns** | Padroes regex para excluir arquivos da indexacao | vazio |

> **Indexacao multimodal** (imagens, PDFs, audio, video) e habilitada automaticamente ao usar modelos de embedding nativos do Gemini (`gemini-embedding-*`). Nenhuma configuracao manual necessaria.

**Indice Externo:**

Use um indice pre-construido em vez de sincronizar a partir do vault:

1. Ative o toggle **Usar indice externo**
2. Defina o caminho absoluto para um diretorio contendo `index.json` e `vectors.bin`
3. Opcionalmente, defina a URL Base de Embedding para embedding de consulta (vazio = API Gemini)
4. O modelo de embedding e detectado automaticamente a partir do arquivo de indice

**Como funciona:** Quando o RAG esta ativo, cada mensagem de chat aciona uma busca vetorial local. Chunks relevantes sao injetados no prompt do sistema como contexto. As fontes sao exibidas na interface do chat — clique para abrir a nota referenciada.

### Aba de Busca RAG

A aba **RAG Search** fornece uma interface dedicada para buscar, filtrar, editar e enviar resultados RAG para o Chat ou Discussion.

![RAG Search](docs/images/rag-search.png)

- **Busca semântica** com Top K e limiar de pontuação ajustáveis
- **Filtro por palavras-chave** para refinar os resultados após a busca
- **Editor de fragmentos** com carregamento de fragmentos adjacentes (anterior/próximo) e remoção de sobreposição
- **Enviar para Chat ou Discussion** — os resultados selecionados tornam-se anexos editáveis
- **Configurações do índice** (ícone de engrenagem) — configure tamanho do fragmento, sobreposição, pastas alvo, sincronização e mais

> Para mais detalhes, consulte a [Documentação do RAG Search](docs/RAG_SEARCH.md) ([日本語](docs/RAG_SEARCH_ja.md) | [中文](docs/RAG_SEARCH_zh.md) | [한국어](docs/RAG_SEARCH_ko.md) | [Français](docs/RAG_SEARCH_fr.md) | [Deutsch](docs/RAG_SEARCH_de.md) | [Español](docs/RAG_SEARCH_es.md) | [Português](docs/RAG_SEARCH_pt.md) | [Italiano](docs/RAG_SEARCH_it.md))

### AI Discussion

A aba **Discussion** fornece uma arena de debate multi-modelo onde varios modelos de IA discutem um topico em paralelo, tiram conclusoes e votam na melhor resposta.

![AI Discussion](docs/images/ai-discussion.png)

**Como funciona:**

1. Abra a aba **Discussion**
2. Insira um tema de discussao
3. Adicione participantes — escolha qualquer modelo disponivel (API, CLI, Local LLM) ou User
4. Opcionalmente, atribua papeis aos participantes (ex.: "Afirmativo", "Critico")
5. Defina o numero de turnos
6. Clique em **Start Discussion**

![Discussion Setup](docs/images/ai-discussion-start.png)

**Fluxo da discussao:**

1. **Turnos de discussao** — Todos os participantes respondem em paralelo. Cada turno se baseia nas respostas anteriores.
2. **Conclusao** — No ultimo turno, cada participante apresenta sua conclusao.
3. **Votacao** — Os participantes votantes avaliam todas as conclusoes e votam na melhor.
4. **Resultado** — O vencedor (ou empate) e anunciado. Salve a transcricao completa como nota Markdown.

![Voting Results](docs/images/ai-discussion-voting.png)

**Funcionalidades:**

- **Qualquer modelo como participante** — Combine modelos livremente (ex.: Gemini vs Claude vs GPT)
- **Participacao do usuario** — Adicione-se como participante ou votante para discussoes com intervencao humana
- **Atribuicao de papeis** — De a cada participante uma perspectiva (ex.: "Otimista", "Cetico")
- **Votantes separados** — Os participantes votantes sao sincronizados automaticamente dos participantes da discussao, mas podem ser personalizados independentemente
- **Configuracao persistente** — Participantes e votantes sao salvos e restaurados entre sessoes
- **Modal de configuracoes** — Clique no icone de engrenagem (⚙️) para configurar prompt do sistema, prompt de conclusao, prompt de votacao, pasta de saida e turnos padrao
- **Salvar como nota** — Exporte a discussao completa (turnos, conclusoes, votos, vencedor) como arquivo Markdown

### Comandos de Barra
- Definir templates de prompt personalizados acionados por `/`
- Override opcional de modelo e busca por comando

![Comandos de Barra](docs/images/setting_slash_command.png)

## Requisitos

- Obsidian v0.15.0+
- Pelo menos um dos seguintes: chave de API (Gemini, OpenAI, Anthropic, OpenRouter, Grok), servidor LLM local ou ferramenta CLI
- Somente desktop (para mobile, veja [Gemini Helper](https://github.com/takeshy/obsidian-gemini-helper))

## Privacidade

**Dados armazenados localmente:**
- Chaves de API (armazenadas nas configuracoes do Obsidian)
- Historico de chat (como arquivos Markdown, opcionalmente criptografados)
- Historico de execucao de workflow (opcionalmente criptografado)
- Indice vetorial RAG (armazenado na pasta do workspace)
- Chaves de criptografia (chave privada criptografada com sua senha)

**Dados enviados aos provedores de LLM:**
- Mensagens de chat e anexos de arquivos sao enviados ao provedor de API configurado (Gemini, OpenAI, Anthropic, OpenRouter, Grok ou endpoint personalizado)
- Quando Web Search esta habilitado (somente Gemini), consultas sao enviadas ao Google Search
- Provedores de LLM locais enviam dados apenas para o seu servidor local

**Dados enviados a servicos de terceiros:**
- Nos `http` de workflow podem enviar dados para qualquer URL especificada no workflow

**Provedores CLI (opcional):**
- Quando o modo CLI esta habilitado, ferramentas CLI externas (gemini, claude, codex) sao executadas via child_process
- Isso so ocorre quando explicitamente configurado e verificado pelo usuario
- O modo CLI executa ferramentas CLI externas via child_process

**Bot Discord (opcional):**
- Quando habilitado, o plugin conecta ao Discord via WebSocket Gateway e envia mensagens dos usuarios para o provedor de LLM configurado
- O token do bot e armazenado nas configuracoes do Obsidian
- O conteudo das mensagens dos canais do Discord e processado pelo LLM — configure canais/usuarios permitidos para restringir o acesso

**Servidores MCP (opcional):**
- Servidores MCP (Model Context Protocol) podem ser configurados nas configuracoes do plugin para nos `mcp` de workflows
- Servidores MCP sao servicos externos que fornecem ferramentas e capacidades adicionais

**Notas de seguranca:**
- Revise workflows antes de executar - nos `http` podem transmitir dados do vault para endpoints externos
- Nos `note` de workflow mostram um dialogo de confirmacao antes de gravar arquivos (comportamento padrao)
- Comandos de barra com `confirmEdits: false` aplicarao edicoes de arquivo automaticamente sem mostrar botoes Apply/Discard
- Credenciais sensiveis: Nao armazene chaves de API ou tokens diretamente no YAML do workflow (headers `http`, configuracoes `mcp`, etc.). Em vez disso, armazene-os em arquivos criptografados e use o no `note-read` para recupera-los em tempo de execucao. Workflows podem ler arquivos criptografados com solicitacao de senha.

Veja os termos de servico de cada provedor para politicas de retencao de dados.

## Licenca

MIT

## Links

- [Documentacao da API Gemini](https://ai.google.dev/docs)
- [Documentacao da API OpenAI](https://platform.openai.com/docs)
- [Documentacao da API Anthropic](https://docs.anthropic.com)
- [Documentacao do OpenRouter](https://openrouter.ai/docs)
- [Ollama](https://ollama.com)
- [Documentacao de Plugins do Obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## Apoie

Se voce achar este plugin util, considere me pagar um cafe!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/takeshy)
