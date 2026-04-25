# LLM Hub per Obsidian

[![DeepWiki](https://img.shields.io/badge/DeepWiki-takeshy%2Fobsidian--llm--hub-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTloMTZhMiAyIDAgMCAwIDItMlY3YTIgMiAwIDAgMC0yLTJINWEyIDIgMCAwIDAtMiAydjEyYTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTkgMTV2LTQiLz48cGF0aCBkPSJNMTIgMTV2LTIiLz48cGF0aCBkPSJNMTUgMTV2LTQiLz48L3N2Zz4=)](https://deepwiki.com/takeshy/obsidian-llm-hub)

Assistente AI **gratuito e open-source** per Obsidian con **Chat**, **Automazione dei Workflow** e **Ricerca Semantica (RAG)**. Supporta diversi provider LLM — usa l'AI che meglio si adatta alle tue esigenze.

> **Usa qualsiasi provider LLM:** [Gemini](https://ai.google.dev), [OpenAI](https://platform.openai.com), [Anthropic](https://console.anthropic.com), [OpenRouter](https://openrouter.ai), [Grok](https://console.x.ai), [OpenCode Zen / Go](https://opencode.ai), LLM locali ([Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), [vLLM](https://docs.vllm.ai), [OpenCode](https://opencode.ai)), o strumenti CLI ([Gemini CLI](https://github.com/google-gemini/gemini-cli), [Claude Code](https://github.com/anthropics/claude-code), [Codex CLI](https://github.com/openai/codex)).

## Caratteristiche Principali

- **Chat LLM Multi-Provider** - Usa Gemini, OpenAI, Anthropic, OpenRouter, Grok, OpenCode Zen/Go, LLM locali o backend CLI
- **Operazioni sul Vault** - L'AI legge, scrive, cerca e modifica le tue note con function calling (Gemini, OpenAI, Anthropic, OpenCode Zen/Go, e LLM locali compatibili con tools tramite LM Studio / vLLM / AnythingLLM)
- **Workflow Builder** - Automatizza attività multi-step con editor visuale e 25 tipi di nodi
- **Ricerca Semantica (RAG)** - Ricerca vettoriale locale con scheda di ricerca dedicata, anteprima PDF e flusso risultati verso chat
- **AI Discussion** - Arena di dibattito multi-modello con risposte parallele, votazione e determinazione del vincitore
- **Cronologia Modifiche** - Traccia e ripristina le modifiche fatte dall'AI con vista diff
- **Ricerca Web** - Accedi a informazioni aggiornate tramite Google Search (Gemini)
- **Generazione di Immagini** - Crea immagini con Gemini o DALL-E
- **Integrazione Discord** - Collega il tuo LLM a Discord come chat bot con selezione di modello/RAG per canale
- **Crittografia** - Proteggi con password la cronologia chat e i log di esecuzione dei workflow


## Provider Supportati

| Provider | Chat | Strumenti Vault | Ricerca Web | Gen. Immagini | RAG |
|----------|------|-----------------|-------------|---------------|-----|
| **Gemini** (API) | ✅ Streaming | ✅ Function calling | ✅ Google Search | ✅ Modelli immagine Gemini | ✅ |
| **OpenAI** (API) | ✅ Streaming | ✅ Function calling | ❌ | ✅ DALL-E | ✅ |
| **Anthropic** (API) | ✅ Streaming | ✅ Tool use | ❌ | ❌ | ✅ |
| **OpenRouter** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **Grok** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **LLM Locale** (Ollama, LM Studio, vLLM) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |
| **CLI** (Gemini, Claude, Codex) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |

> [!TIP]
> **È possibile configurare più provider contemporaneamente.** Cambia modello liberamente durante la chat — ogni provider ha la propria chiave API e le proprie impostazioni.

> [!TIP]
> Le **Opzioni CLI** ti permettono di usare modelli flagship con un semplice account - nessuna chiave API necessaria!
> - **Gemini CLI**: Installa [Gemini CLI](https://github.com/google-gemini/gemini-cli), esegui `gemini` e autenticati con `/auth`
> - **Claude CLI**: Installa [Claude Code](https://github.com/anthropics/claude-code) (`npm install -g @anthropic-ai/claude-code`), esegui `claude` e autenticati
> - **Codex CLI**: Installa [Codex CLI](https://github.com/openai/codex) (`npm install -g @openai/codex`), esegui `codex` e autenticati

### Suggerimenti per la Chiave API Gratuita di Gemini

- I **limiti di frequenza** sono per modello e si resettano giornalmente. Cambia modello per continuare a lavorare.
- **Gemma 4** non può combinare le chiamate di funzione con RAG/Web Search in una singola richiesta. Quando RAG o Web Search è attivo, gli strumenti Vault vengono automaticamente disabilitati. I **modelli CLI**, **Ollama** e l'**OpenCode local server** non supportano gli strumenti Vault (usa i **Workflow** con `note`, `note-read`, ecc., o le variabili `{content}` / `{selection}`). I LLM locali **LM Studio / vLLM / AnythingLLM** SUPPORTANO gli strumenti Vault quando il modello sottostante supporta il function calling in stile OpenAI — i modelli incompatibili vengono rilevati automaticamente al primo utilizzo e degradati alla modalità skill basata su marker.

---

# Chat AI

La funzionalità Chat AI fornisce un'interfaccia di conversazione interattiva con il provider LLM scelto, integrata con il tuo vault Obsidian.

![Interfaccia Chat](docs/images/chat.png)

**Aprire la Chat:**
- Clicca l'icona chat nel ribbon
- Comando: "LLM Hub: Open chat"
- Toggle: "LLM Hub: Toggle chat / editor"

**Controlli della Chat:**
- **Invio** - Invia messaggio
- **Shift+Invio** - Nuova riga
- **Pulsante Stop** - Ferma la generazione
- **Pulsante +** - Nuova chat
- **Pulsante Cronologia** - Carica chat precedenti

## Comandi Slash

Crea template di prompt riutilizzabili attivati con `/`:

- Definisci template con `{selection}` (testo selezionato) e `{content}` (nota attiva)
- Override opzionale di modello e ricerca per comando
- Digita `/` per vedere i comandi disponibili

**Default:** `/infographic` - Converte il contenuto in infografica HTML

![Esempio Infografica](docs/images/chat_infographic.png)

## Menzioni con @

Fai riferimento a file e variabili digitando `@`:

- `{selection}` - Testo selezionato
- `{content}` - Contenuto della nota attiva
- Qualsiasi file del vault - Sfoglia e inserisci (solo percorso; l'AI legge il contenuto tramite strumenti)

> [!NOTE]
> **Come funzionano `{selection}` e `{content}`:** Quando passi dalla Vista Markdown alla Vista Chat, la selezione verrebbe normalmente cancellata a causa del cambio di focus. Per preservare la tua selezione, il plugin la cattura durante il cambio di vista ed evidenzia l'area selezionata con un colore di sfondo nella Vista Markdown. L'opzione `{selection}` appare nei suggerimenti @ solo quando è stato selezionato del testo.
>
> Sia `{selection}` che `{content}` **non vengono espansi** intenzionalmente nell'area di input—poiché l'input della chat è compatto, espandere testo lungo renderebbe difficile la digitazione. Il contenuto viene espanso quando invii il messaggio, cosa che puoi verificare controllando il tuo messaggio inviato nella chat.

> [!NOTE]
> Le menzioni @ dei file del vault inseriscono solo il percorso del file - l'AI legge il contenuto tramite strumenti. Questo non funziona con i modelli CLI, Ollama o OpenCode (Local) (nessun supporto per strumenti vault); Gemini CLI può leggere file via shell, ma il formato della risposta potrebbe differire. I LLM locali **LM Studio / vLLM / AnythingLLM** funzionano se il modello caricato supporta il tool calling.

## Allegati

Allega file direttamente: Immagini (PNG, JPEG, GIF, WebP), PDF, file di testo

## Function Calling (Operazioni sul Vault)

L'AI può interagire con il tuo vault usando questi strumenti:

| Strumento | Descrizione |
|-----------|-------------|
| `read_note` | Legge il contenuto di una nota |
| `create_note` | Crea nuove note |
| `propose_edit` | Modifica con dialogo di conferma |
| `propose_delete` | Elimina con dialogo di conferma |
| `bulk_propose_edit` | Modifica multipla di file con dialogo di selezione |
| `bulk_propose_delete` | Eliminazione multipla di file con dialogo di selezione |
| `search_notes` | Cerca nel vault per nome o contenuto |
| `list_notes` | Elenca le note in una cartella |
| `rename_note` | Rinomina/sposta note |
| `create_folder` | Crea nuove cartelle |
| `list_folders` | Elenca le cartelle nel vault |
| `get_active_note_info` | Ottiene informazioni sulla nota attiva |
| `bulk_propose_rename` | Rinomina in massa di più file con finestra di selezione |

### Modalità Strumenti Vault

Quando l'AI gestisce le note nella Chat, utilizza gli strumenti Vault. Controlla quali strumenti del vault può usare l'AI tramite l'icona del database (📦) sotto il pulsante allegati:

| Modalità | Descrizione | Strumenti Disponibili |
|----------|-------------|----------------------|
| **Vault: Tutti** | Accesso completo al vault | Tutti gli strumenti |
| **Vault: Senza ricerca** | Esclude gli strumenti di ricerca | Tutti tranne `search_notes`, `list_notes` |
| **Vault: Disattivato** | Nessun accesso al vault | Nessuno |

**Quando usare ogni modalità:**

- **Vault: Tutti** - Modalità predefinita per uso generale. L'AI può leggere, scrivere e cercare nel tuo vault.
- **Vault: Senza ricerca** - Usala quando conosci già il file di destinazione. Questo evita ricerche ridondanti nel vault, risparmiando token e migliorando il tempo di risposta.
- **Vault: Disattivato** - Usala quando non hai bisogno di accesso al vault.

**Selezione automatica della modalità:**

| Condizione | Modalità Predefinita | Modificabile |
|------------|---------------------|--------------|
| Modelli CLI (Gemini/Claude/Codex CLI) | Vault: Disattivato | No |
| LLM Locale | Vault: Disattivato | No |
| Gemma 4 + RAG/Web Search | Vault: Disattivato | Sì (disabilitare RAG/Web Search riattiva gli strumenti) |
| Normale | Vault: Tutti | Sì |

**Perché alcune modalità sono forzate:**

- **Modelli CLI, Ollama, OpenCode (Local)**: Non espongono il function calling in stile OpenAI, quindi gli strumenti Vault non possono essere utilizzati. I LLM locali **LM Studio / vLLM / AnythingLLM** POSSONO usare gli strumenti Vault quando il modello caricato supporta il tool calling; se un modello rifiuta la prima richiesta con tools, viene contrassegnato automaticamente e ricade in modalità marker per i turni successivi (cancella il contrassegno in **Impostazioni → Local LLM → Re-enable tools**).
- **Gemma 4**: Le chiamate di funzione e RAG/Web Search non possono essere combinati in una singola richiesta. Quando uno è attivo, l'altro viene automaticamente disabilitato.

## Modifica Sicura

Quando l'AI usa `propose_edit`:
1. Un dialogo di conferma mostra le modifiche proposte
2. Clicca **Applica** per scrivere le modifiche nel file
3. Clicca **Annulla** per cancellare senza modificare il file

> Le modifiche NON vengono scritte finché non confermi.

## Cronologia Modifiche

Traccia e ripristina le modifiche apportate alle tue note:

- **Tracciamento automatico** - Tutte le modifiche AI (chat, workflow) e le modifiche manuali vengono registrate
- **Accesso dal menu file** - Clicca con il tasto destro su un file markdown per accedere a:
  - **Snapshot** - Salva lo stato attuale come snapshot
  - **History** - Apri il modale della cronologia modifiche


- **Palette comandi** - Disponibile anche tramite il comando "Show edit history"
- **Vista diff** - Vedi esattamente cosa è cambiato con aggiunte/eliminazioni colorate
- **Ripristina** - Torna a qualsiasi versione precedente con un clic
- **Copia** - Salva una versione storica come nuovo file (nome predefinito: `{filename}_{datetime}.md`)
- **Modale ridimensionabile** - Trascina per spostare, ridimensiona dagli angoli

**Visualizzazione diff:**
- Le righe `+` esistevano nella versione precedente
- Le righe `-` sono state aggiunte nella versione più recente

**Come funziona:**

La cronologia modifiche usa un approccio basato su snapshot:

1. **Creazione snapshot** - Quando un file viene aperto per la prima volta o modificato dall'AI, viene salvato uno snapshot del suo contenuto
2. **Registrazione diff** - Quando il file viene modificato, la differenza tra il nuovo contenuto e lo snapshot viene registrata come voce della cronologia
3. **Aggiornamento snapshot** - Lo snapshot viene aggiornato al nuovo contenuto dopo ogni modifica
4. **Ripristino** - Per ripristinare una versione precedente, i diff vengono applicati al contrario dallo snapshot

**Quando viene registrata la cronologia:**
- Modifiche chat AI (strumento `propose_edit`)
- Modifiche note workflow (nodo `note`)
- Salvataggi manuali tramite comando
- Auto-rilevamento quando il file differisce dallo snapshot all'apertura

**Archiviazione:** La cronologia delle modifiche è memorizzata in memoria e viene cancellata al riavvio di Obsidian. Il tracciamento persistente delle versioni è coperto dal recupero file integrato di Obsidian.

![Modale Cronologia Modifiche](docs/images/edit_history.png)

## Server MCP

I server MCP (Model Context Protocol) forniscono strumenti aggiuntivi che estendono le capacità dell'AI oltre le operazioni del vault.

**Sono supportate due modalità di trasporto:**

**HTTP (Streamable HTTP):**

1. Apri le impostazioni del plugin → sezione **MCP Servers**
2. Clicca su **Add server** → seleziona **HTTP**
3. Inserisci il nome e l'URL del server
4. Configura gli header opzionali (formato JSON) per l'autenticazione
5. Clicca su **Test connection** per verificare e recuperare gli strumenti disponibili
6. Salva la configurazione del server

**Stdio (Processo locale):**

1. Apri le impostazioni del plugin → sezione **MCP Servers**
2. Clicca su **Add server** → seleziona **Stdio**
3. Inserisci il nome del server e il comando (es. `npx -y @modelcontextprotocol/server-filesystem /path/to/dir`)
4. Configura le variabili d'ambiente opzionali (formato JSON)
5. Clicca su **Test connection** per verificare e recuperare gli strumenti disponibili
6. Salva la configurazione del server

> **Nota:** Il trasporto Stdio avvia un processo locale ed è disponibile solo su desktop. Il test di connessione è obbligatorio prima del salvataggio.

![Impostazioni Server MCP](docs/images/setting_mcp.png)

**Utilizzo degli strumenti MCP:**

- **Nella chat:** Clicca sull'icona del database (📦) per aprire le impostazioni degli strumenti. Abilita/disabilita i server MCP per conversazione.
- **Nei workflow:** Usa il nodo `mcp` per chiamare gli strumenti del server MCP.

**Suggerimenti strumenti:** Dopo un test di connessione riuscito, i nomi degli strumenti disponibili vengono salvati e visualizzati sia nelle impostazioni che nell'interfaccia della chat.

### MCP Apps (UI Interattiva)

Alcuni strumenti MCP restituiscono UI interattiva che permette di interagire visivamente con i risultati dello strumento. Questa funzionalità è basata sulla [specifica MCP Apps](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/mcp_apps).


**Come funziona:**

- Quando uno strumento MCP restituisce un URI risorsa `ui://` nei metadati della risposta, il plugin recupera e renderizza il contenuto HTML
- L'UI viene visualizzata in un iframe sandboxed per sicurezza (`sandbox="allow-scripts allow-forms"`)
- Le applicazioni interattive possono chiamare strumenti MCP aggiuntivi e aggiornare il contesto tramite un bridge JSON-RPC

**Nella Chat:**
- MCP Apps appare inline nei messaggi dell'assistente con un pulsante espandi/comprimi
- Clicca su ⊕ per espandere a schermo intero, ⊖ per comprimere

**Nei Workflow:**
- MCP Apps viene visualizzato in una finestra di dialogo modale durante l'esecuzione del workflow
- Il workflow si mette in pausa per permettere l'interazione dell'utente, poi continua quando il modale viene chiuso

> **Sicurezza:** Tutto il contenuto MCP App viene eseguito in un iframe sandboxed con permessi limitati. L'iframe non può accedere al DOM della pagina padre, ai cookie o al localStorage. Solo `allow-scripts` e `allow-forms` sono abilitati.

## Skill dell'Agente

Estendi le capacità dell'IA con istruzioni personalizzate, materiali di riferimento e workflow eseguibili. Gli skill seguono il modello standard del settore per gli skill dell'agente (es. [OpenAI Codex](https://github.com/openai/codex) `.codex/skills/`).

- **Istruzioni personalizzate** - Definisci il comportamento specifico del dominio tramite file `SKILL.md`
- **Materiali di riferimento** - Includi guide di stile, modelli e checklist in `references/`
- **Integrazione dei workflow** - Gli skill possono esporre workflow come strumenti di Function Calling
- **Comando slash** - Digita `/folder-name` per invocare uno skill istantaneamente e inviare
- **Supporto modalità CLI** - Gli skill funzionano con i backend Gemini CLI, Claude CLI e Codex CLI
- **Attivazione selettiva** - Scegli quali skill sono attivi per conversazione

Crea gli skill allo stesso modo dei workflow — seleziona **+ New (AI)**, attiva **"Crea come agent skill"** e descrivi cosa vuoi. L'AI genera sia le istruzioni del `SKILL.md` che il workflow.

> **Per le istruzioni di configurazione e gli esempi, consulta [SKILLS.md](docs/SKILLS_it.md)**

---

# Integrazione Discord

Collega il LLM del tuo vault Obsidian a Discord come chat bot. Gli utenti possono chattare con l'AI, cambiare modello, usare la ricerca RAG e attivare i comandi slash — tutto da Discord.

## Configurazione

### 1. Creare un bot Discord

1. Vai al [Discord Developer Portal](https://discord.com/developers/applications)
2. Clicca **New Application** → inserisci un nome → **Create**
3. Vai a **Bot** nella barra laterale sinistra
4. Clicca **Reset Token** → copia il token del bot (ti servirà dopo)
5. Sotto **Privileged Gateway Intents**, abilita **Message Content Intent** (necessario per leggere il testo dei messaggi)

### 2. Invitare il bot nel tuo server

1. Vai a **OAuth2** nella barra laterale sinistra
2. Sotto **OAuth2 URL Generator**, seleziona lo scope **bot**
3. Sotto **Bot Permissions**, seleziona:
   - **Send Messages**
   - **Read Message History**
4. Copia l'URL generato e aprilo nel browser
5. Seleziona un server e autorizza il bot

### 3. Configurare in Obsidian

1. Apri le impostazioni del plugin → sezione **Discord**
2. Abilita **Discord Bot**
3. Incolla il token del bot
4. Clicca **Connect** (il plugin verifica il token prima di connettersi)
5. L'indicatore di stato mostra se il bot è connesso

## Opzioni di Configurazione

| Impostazione | Descrizione | Predefinito |
|--------------|-------------|-------------|
| **Enabled** | Attiva/disattiva il bot Discord | Off |
| **Bot Token** | Token del bot Discord dal Developer Portal | — |
| **Respond to DMs** | Se il bot risponde ai messaggi diretti | On |
| **Require @mention** | Nei canali del server, risponde solo quando menzionato con @ (i DM rispondono sempre) | On |
| **Allowed Channel IDs** | ID dei canali separati da virgola per limitare l'accesso (vuoto = tutti i canali) | vuoto |
| **Allowed User IDs** | ID degli utenti separati da virgola per limitare l'accesso (vuoto = tutti gli utenti) | vuoto |
| **Model Override** | Specifica quale modello usare per Discord (vuoto = modello attualmente selezionato) | vuoto |
| **System Prompt Override** | Prompt di sistema personalizzato per le conversazioni Discord | vuoto |
| **Max Response Length** | Lunghezza massima per messaggio (1–2000, limite di Discord) | 2000 |

> [!TIP]
> **Trovare gli ID dei canali/utenti:** In Discord, abilita la **Modalità Sviluppatore** (Impostazioni → Avanzate → Modalità Sviluppatore). Poi clicca col tasto destro su un canale o un utente e seleziona **Copia ID**.

## Comandi del Bot

Gli utenti possono interagire con il bot usando questi comandi in Discord:

| Comando | Descrizione |
|---------|-------------|
| `!model` | Elenca i modelli disponibili |
| `!model <nome>` | Passa a un modello specifico per questo canale |
| `!rag` | Elenca le impostazioni RAG disponibili |
| `!rag <nome>` | Passa a un'impostazione RAG specifica per questo canale |
| `!rag off` | Disabilita RAG per questo canale |
| `!skill` | Elenca i comandi slash disponibili |
| `!skill <nome>` | Attiva un comando slash (potrebbe richiedere un messaggio successivo) |
| `!discuss <theme>` | Avvia AI Discussion con i partecipanti configurati (in background) |
| `!reset` | Cancella la cronologia della conversazione per questo canale |
| `!help` | Mostra il messaggio di aiuto |

## Funzionalità

- **Supporto multi-provider** — Funziona con tutti i provider LLM configurati (Gemini, OpenAI, Anthropic, OpenRouter, Grok, CLI, LLM Locale)
- **Stato per canale** — Ogni canale Discord mantiene la propria cronologia delle conversazioni, selezione del modello e impostazione RAG
- **Strumenti vault** — L'AI ha accesso completo agli strumenti vault (leggere, scrivere, cercare note) in base alle impostazioni del plugin
- **Integrazione RAG** — La ricerca semantica può essere abilitata per canale tramite il comando `!rag`
- **Comandi slash** — Attiva i comandi slash del plugin tramite `!skill`
- **Divisione messaggi lunghi** — Le risposte che superano il limite di 2000 caratteri di Discord vengono automaticamente divise nei punti di interruzione naturali
- **Memoria della conversazione** — Cronologia per canale (massimo 20 messaggi, TTL di 30 minuti)
- **Riconnessione automatica** — Recupera dalle disconnessioni con backoff esponenziale

> [!NOTE]
> La cronologia delle conversazioni viene mantenuta solo in memoria e viene cancellata quando il bot si disconnette o Obsidian viene riavviato.

---

# Workflow Builder

Costruisci workflow automatizzati multi-step direttamente nei file Markdown. **Non è richiesta conoscenza di programmazione** - descrivi semplicemente ciò che vuoi in linguaggio naturale, e l'AI creerà il workflow per te.

![Editor Visuale dei Workflow](docs/images/visual_workflow.png)

## Creazione di Workflow e Skill con AI

**Non hai bisogno di imparare la sintassi YAML o i tipi di nodo.** Descrivi semplicemente il tuo workflow in linguaggio naturale:

1. Apri la scheda **Workflow** nella sidebar di LLM Hub
2. Seleziona **+ New (AI)** dal menu a tendina
3. Descrivi cosa vuoi: *"Crea un workflow che riassuma la nota selezionata e la salvi in una cartella summaries"*
4. Seleziona **"Crea come agent skill"** se vuoi creare un agent skill invece di un workflow autonomo
5. Clicca **Generate** - l'AI crea il workflow completo

![Crea Workflow con AI](docs/images/create_workflow_with_ai.png)

**Modifica i workflow esistenti allo stesso modo:**
1. Carica un workflow qualsiasi
2. Clicca il pulsante **AI Modify**
3. Descrivi le modifiche: *"Aggiungi uno step per tradurre il riassunto in giapponese"*
4. Rivedi e applica


## Tipi di Nodo Disponibili

24 tipi di nodo sono disponibili per costruire workflow:

| Categoria | Nodi |
|-----------|------|
| Variabili | `variable`, `set` |
| Controllo | `if`, `while` |
| LLM | `command` |
| Dati | `http`, `json`, `script` |
| Note | `note`, `note-read`, `note-search`, `note-list`, `folder-list`, `open` |
| File | `file-explorer`, `file-save` |
| Prompt | `prompt-file`, `prompt-selection`, `dialog` |
| Composizione | `workflow` |
| Esterni | `mcp`, `obsidian-command` |
| Utilità | `sleep` |

> **Per specifiche dettagliate sui nodi ed esempi, consulta [WORKFLOW_NODES.md](docs/WORKFLOW_NODES_it.md)**

## Modalità Hotkey

Assegna scorciatoie da tastiera per eseguire workflow istantaneamente:

1. Aggiungi un campo `name:` al tuo workflow
2. Apri il file del workflow e seleziona il workflow dal menu a tendina
3. Clicca l'icona della tastiera (⌨️) nel footer del pannello Workflow
4. Vai in Impostazioni → Hotkeys → cerca "Workflow: [Nome del Tuo Workflow]"
5. Assegna un hotkey (es. `Ctrl+Shift+T`)

Quando attivato da hotkey:
- `prompt-file` usa automaticamente il file attivo (nessun dialogo)
- `prompt-selection` usa la selezione corrente, o il contenuto completo del file se non c'è selezione

## Trigger degli Eventi

I workflow possono essere attivati automaticamente dagli eventi di Obsidian:

![Impostazioni Trigger Eventi](docs/images/event_setting.png)

| Evento | Descrizione |
|--------|-------------|
| File Created | Attivato quando viene creato un nuovo file |
| File Modified | Attivato quando un file viene salvato (debounced 5s) |
| File Deleted | Attivato quando un file viene eliminato |
| File Renamed | Attivato quando un file viene rinominato |
| File Opened | Attivato quando un file viene aperto |

**Configurazione trigger eventi:**
1. Aggiungi un campo `name:` al tuo workflow
2. Apri il file del workflow e seleziona il workflow dal menu a tendina
3. Clicca l'icona del fulmine (⚡) nel footer del pannello Workflow
4. Seleziona quali eventi devono attivare il workflow
5. Opzionalmente aggiungi un filtro per pattern di file

**Esempi di pattern file:**
- `**/*.md` - Tutti i file Markdown in qualsiasi cartella
- `journal/*.md` - File Markdown solo nella cartella journal
- `*.md` - File Markdown solo nella cartella root
- `**/{daily,weekly}/*.md` - File nelle cartelle daily o weekly
- `projects/[a-z]*.md` - File che iniziano con lettera minuscola

**Variabili degli eventi:** Quando attivato da un evento, queste variabili vengono impostate automaticamente:

| Variabile | Descrizione |
|-----------|-------------|
| `_eventType` | Tipo di evento: `create`, `modify`, `delete`, `rename`, `file-open` |
| `_eventFilePath` | Percorso del file interessato |
| `_eventFile` | JSON con informazioni sul file (path, basename, name, extension) |
| `_eventFileContent` | Contenuto del file (per eventi create/modify/file-open) |
| `_eventOldPath` | Percorso precedente (solo per eventi rename) |

> **Nota:** I nodi `prompt-file` e `prompt-selection` usano automaticamente il file dell'evento quando attivati da eventi. `prompt-selection` usa l'intero contenuto del file come selezione.

---

# Comune

## Modelli Supportati

### Gemini

| Modello | Descrizione |
|---------|-------------|
| Gemini 3.1 Pro Preview | Ultimo modello di punta, contesto 1M (consigliato) |
| Gemini 3.1 Pro Preview (Custom Tools) | Ottimizzato per flussi di lavoro agentici con strumenti personalizzati e bash |
| Gemini 3 Flash Preview | Modello veloce, contesto 1M, miglior rapporto costo-prestazioni |
| Gemini 3.1 Flash Lite Preview | Modello più conveniente con alte prestazioni |
| Gemini 2.5 Flash | Modello veloce, contesto 1M |
| Gemini 2.5 Pro | Modello Pro, contesto 1M |
| Gemini 3 Pro (Image) | Generazione immagini Pro, 4K |
| Gemini 3.1 Flash (Image) | Generazione immagini veloce e a basso costo |
| Gemma 4 | Gratuito, chiamate di funzione e RAG/Web Search mutuamente esclusivi |

> **Modalità Thinking:** Nella chat, la modalità thinking viene attivata da parole chiave come "pensa", "analizza" o "rifletti" nel messaggio. Tuttavia, **Gemini 3.1 Pro** utilizza sempre la modalità thinking indipendentemente dalle parole chiave — questo modello non supporta la disattivazione del thinking.

**Toggle Always Think:**

Puoi forzare la modalità thinking su ON per i modelli Flash senza usare parole chiave. Clicca sull'icona del database (📦) per aprire il menu degli strumenti e seleziona i toggle sotto **Always Think**:

- **Flash** — OFF per default. Seleziona per abilitare sempre il thinking per i modelli Flash.
- **Flash Lite** — ON per default. Flash Lite ha una differenza minima di costo e velocità con il thinking abilitato, quindi si consiglia di tenerlo attivo.

Quando un toggle è ON, il thinking è sempre attivo per quella famiglia di modelli indipendentemente dal contenuto del messaggio. Quando è OFF, viene utilizzato il rilevamento basato su parole chiave esistente.

![Always Think Settings](docs/images/setting_thinking.png)

### OpenAI

| Modello | Descrizione |
|---------|-------------|
| GPT-5.4 | Ultimo modello di punta |
| GPT-5.4-mini | Modello mid-tier conveniente |
| GPT-5.4-nano | Modello leggero e veloce |
| O3 | Modello di ragionamento |
| DALL-E 3 / DALL-E 2 | Generazione immagini |

### Anthropic

| Modello | Descrizione |
|---------|-------------|
| Claude Opus 4.6 | Modello più capace, pensiero esteso |
| Claude Sonnet 4.6 | Equilibrio tra prestazioni e costo |
| Claude Haiku 4.5 | Modello veloce e leggero |

### OpenRouter / Grok / Custom

Configura qualsiasi endpoint compatibile con OpenAI con URL base e modelli personalizzati. OpenRouter fornisce accesso a centinaia di modelli da vari provider.

### OpenCode Zen / Go

OpenCode offre due gateway ospitati dallo stesso account, entrambi selezionabili dal menu a tendina del provider:

- **OpenCode Zen** (`https://opencode.ai/zen`) — pagamento a consumo, include diversi modelli gratuiti (Big Pickle, MiniMax M2.5 Free, ecc.) e un ampio catalogo di modelli (Claude, GPT-5.x, e altri). Espone gli endpoint `/v1/models` + `/v1/chat/completions` compatibili con OpenAI, quindi i modelli vengono elencati automaticamente.
- **OpenCode Go** (`https://opencode.ai/zen/go`) — abbonamento da $5 il primo mese, $10/mese successivamente, con modelli di coding curati (GLM, Kimi, DeepSeek, MiMo, MiniMax, Qwen). Espone solo `/v1/chat/completions`, quindi il plugin ricade su una lista di modelli documentata durante il Verify.

### LLM Locale

Connettiti a modelli in esecuzione locale tramite Ollama, LM Studio, vLLM, AnythingLLM o il server locale di OpenCode. I modelli vengono rilevati automaticamente dal server in esecuzione.

## Installazione

### BRAT (Consigliato)
1. Installa il plugin [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Apri le impostazioni BRAT → "Add Beta plugin"
3. Inserisci: `https://github.com/takeshy/obsidian-llm-hub`
4. Abilita il plugin nelle impostazioni dei Community plugins

### Manuale
1. Scarica `main.js`, `manifest.json`, `styles.css` dalle release
2. Crea la cartella `llm-hub` in `.obsidian/plugins/`
3. Copia i file e abilita nelle impostazioni di Obsidian

### Da Sorgente
```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

## Configurazione

### Provider API

Aggiungi uno o più provider API nelle impostazioni del plugin. Ogni provider ha la propria chiave API e la propria selezione di modelli.

| Provider | Ottieni la Chiave API |
|----------|----------------------|
| Gemini | [ai.google.dev](https://ai.google.dev) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) |
| OpenRouter | [openrouter.ai](https://openrouter.ai) |
| Grok | [console.x.ai](https://console.x.ai) |
| OpenCode Zen | [opencode.ai](https://opencode.ai) |
| OpenCode Go | [opencode.ai](https://opencode.ai) |

Puoi anche aggiungere endpoint personalizzati compatibili con OpenAI.

![Impostazioni Base](docs/images/setting_basic.png)

### LLM Locale

Connettiti a server LLM in esecuzione locale:

1. Avvia il tuo server locale (Ollama, LM Studio, vLLM, AnythingLLM o OpenCode)
2. Inserisci l'URL del server nelle impostazioni del plugin
3. Clicca "Verify" per rilevare i modelli disponibili

> [!NOTE]
> I LLM locali **LM Studio / vLLM / AnythingLLM** usano il function calling in stile OpenAI per gli strumenti vault — abilitato per impostazione predefinita per i modelli compatibili con tools. Se un modello rifiuta la prima richiesta con tools, viene contrassegnato automaticamente e degradato alla modalità skill basata su marker per i turni successivi; cancella il contrassegno in **Impostazioni → Local LLM → Re-enable tools** per riprovare.
>
> **Ollama** e **OpenCode (Local)** continuano a usare solo la modalità marker. Usa workflow o RAG per le operazioni sulle note con quei framework.

#### OpenCode Local Server

Il framework OpenCode si connette a un'istanza locale di `opencode serve`, che espone la propria API HTTP invece del formato OpenAI-compatible `/v1/chat/completions`. Lo streaming utilizza l'endpoint SSE `/global/event` del server.

##### macOS / Linux

1. Installa la CLI di OpenCode:
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```
2. Avvia il server:
   ```bash
   opencode serve
   ```
   Ascolta su `http://localhost:4096` per impostazione predefinita.
3. Nelle impostazioni del plugin → **Local LLM**, seleziona **OpenCode (Local)**, mantieni l'URL predefinito (`http://localhost:4096`) e clicca su **Fetch models**.
4. I modelli vengono elencati come `<providerID>/<modelID>` (es. `google/gemini-flash-lite-latest`). Scegline uno e salva.

##### Windows (WSL)

OpenCode [raccomanda WSL](https://opencode.ai/docs/ja/windows-wsl) su Windows per le prestazioni del file system e la compatibilità degli strumenti. Poiché Obsidian viene eseguito sull'host Windows, il server deve essere collegato a un'interfaccia raggiungibile e — diventando accessibile dall'esterno di WSL — **protetto con una password**.

1. Installa WSL ([guida ufficiale](https://learn.microsoft.com/windows/wsl/install) di Microsoft) e apri un terminale WSL.
2. All'interno di WSL, installa OpenCode:
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```
3. Avvia il server collegato a tutte le interfacce, con una password:
   ```bash
   OPENCODE_SERVER_PASSWORD='your-password' opencode serve --hostname 0.0.0.0 --port 4096
   ```
   WSL2 inoltra `localhost` all'host Windows automaticamente, quindi da Obsidian l'URL è `http://localhost:4096`. Se non si risolve, esegui `hostname -I` in WSL e usa `http://<wsl-ip>:4096` invece.
4. Nelle impostazioni del plugin → **Local LLM** → **OpenCode (Local)**:
   - **Base URL**: `http://localhost:4096` (o l'IP di WSL)
   - **Username**: `opencode` (predefinito; sovrascrivi con `OPENCODE_SERVER_USERNAME` se ne hai impostato uno)
   - **Password**: il valore di `OPENCODE_SERVER_PASSWORD`

   Clicca su **Fetch models**, scegli un modello `<providerID>/<modelID>` e salva.

### Modalità CLI (Gemini / Claude / Codex)

**Gemini CLI:**
1. Installa [Gemini CLI](https://github.com/google-gemini/gemini-cli)
2. Autenticati con `gemini` → `/auth`
3. Clicca "Verify" nella sezione Gemini CLI

**Claude CLI:**
1. Installa [Claude Code](https://github.com/anthropics/claude-code): `npm install -g @anthropic-ai/claude-code`
2. Autenticati con `claude`
3. Clicca "Verify" nella sezione Claude CLI

**Codex CLI:**
1. Installa [Codex CLI](https://github.com/openai/codex): `npm install -g @openai/codex`
2. Autenticati con `codex`
3. Clicca "Verify" nella sezione Codex CLI

**Limitazioni CLI:** Nessun supporto strumenti vault, nessuna ricerca web, solo desktop

> [!NOTE]
> **Utilizzo solo CLI:** Puoi usare la modalità CLI senza alcuna chiave API. Basta installare e verificare uno strumento CLI.

**Percorso CLI personalizzato:** Se il rilevamento automatico del CLI fallisce, clicca sull'icona dell'ingranaggio (⚙️) accanto al pulsante Verify per specificare manualmente il percorso del CLI. Il plugin cerca automaticamente i percorsi di installazione comuni, inclusi i gestori di versioni (nodenv, nvm, volta, fnm, asdf, mise).

<details>
<summary><b>Windows: Come trovare il percorso del CLI</b></summary>

Lascia vuoto il campo percorso CLI e fai clic su **Verify** — il plugin rileva automaticamente l'installazione npm-global (controlla `%APPDATA%\npm\node_modules`, `%PROGRAMFILES%\nodejs\node_modules` e i percorsi basati su PATH) ed esegue il vero entry point `.js` tramite `node`. L'installazione standalone di Claude in `%LOCALAPPDATA%\Programs\claude\claude.exe` viene rilevata automaticamente.

Imposta un percorso CLI personalizzato solo se il rilevamento automatico fallisce. Ognuna delle seguenti opzioni funziona (dalla più sicura alla meno sicura):

1. **Script `.js` (consigliato)** — es. `C:\Users\YourName\AppData\Roaming\npm\node_modules\@google\gemini-cli\dist\index.js`. Eseguito tramite `node` (senza passare per `cmd.exe`).
2. **Eseguibile `.exe`** — es. `C:\Users\YourName\AppData\Local\Programs\claude\claude.exe`. Eseguito direttamente.
3. **Wrapper `.cmd` / `.bat`** — es. `C:\Users\YourName\AppData\Roaming\npm\gemini.cmd`. Deve passare per `cmd.exe`, quindi i prompt contenenti `&`, `|`, `>`, `^` o `%VAR%` possono causare problemi.

Usa `Get-Command gemini` / `Get-Command claude` / `Get-Command codex` in PowerShell per trovare il percorso del wrapper; inseriscilo direttamente (opzione 3) o naviga al `.js` / `.exe` adiacente per le opzioni più sicure.
</details>

<details>
<summary><b>macOS / Linux: Come trovare il percorso del CLI</b></summary>

1. Apri un terminale ed esegui:
   ```bash
   which gemini
   ```
2. Inserisci il percorso mostrato (es: `/home/user/.local/bin/gemini`) nelle impostazioni del percorso CLI

Per Claude CLI, usa `which claude`. Per Codex CLI, usa `which codex`.

**Gestori di versioni Node.js:** Se usi nodenv, nvm, volta, fnm, asdf o mise, il plugin rileva automaticamente il binario node dalle posizioni comuni. Se il rilevamento fallisce, specifica direttamente il percorso dello script CLI (es: `~/.npm-global/lib/node_modules/@google/gemini-cli/dist/index.js`).
</details>

> [!TIP]
> **Suggerimento per Claude CLI:** Le sessioni di chat da LLM Hub vengono salvate localmente. Puoi continuare le conversazioni al di fuori di Obsidian eseguendo `claude --resume` nella directory del tuo vault per vedere e riprendere le sessioni precedenti.

### Impostazioni Workspace
- **Workspace Folder** - Posizione della cronologia chat e impostazioni
- **System Prompt** - Istruzioni aggiuntive per l'AI
- **Tool Limits** - Controlla i limiti delle function call
- **Edit History** - Traccia e ripristina le modifiche fatte dall'AI

![Limiti Strumenti e Cronologia Modifiche](docs/images/setting_tool_history.png)

### Crittografia

Proteggi la cronologia chat e i log di esecuzione dei workflow con password separatamente.

**Configurazione:**

1. Imposta una password nelle impostazioni del plugin (memorizzata in modo sicuro usando crittografia a chiave pubblica)

![Configurazione Iniziale Crittografia](docs/images/setting_initial_encryption.png)

2. Dopo la configurazione, attiva la crittografia per ogni tipo di log:
   - **Crittografa cronologia chat AI** - Crittografa i file delle conversazioni chat
   - **Crittografa log di esecuzione workflow** - Crittografa i file della cronologia workflow

![Impostazioni Crittografia](docs/images/setting_encryption.png)

Ogni impostazione può essere abilitata/disabilitata indipendentemente.

**Funzionalità:**
- **Controlli separati** - Scegli quali log crittografare (chat, workflow o entrambi)
- **Crittografia automatica** - I nuovi file vengono crittografati al salvataggio in base alle impostazioni
- **Cache password** - Inserisci la password una volta per sessione
- **Visualizzatore dedicato** - I file crittografati si aprono in un editor sicuro con anteprima
- **Opzione decrittografia** - Rimuovi la crittografia da singoli file quando necessario

**Come funziona:**

```
[Configurazione - una volta all'impostazione della password]
Password → Genera coppia di chiavi (RSA) → Crittografa chiave privata → Salva nelle impostazioni

[Crittografia - per ogni file]
Contenuto file → Crittografa con nuova chiave AES → Crittografa chiave AES con chiave pubblica
→ Salva nel file: dati crittografati + chiave privata crittografata (dalle impostazioni) + salt

[Decrittografia]
Password + salt → Ripristina chiave privata → Decrittografa chiave AES → Decrittografa contenuto
```

- La coppia di chiavi viene generata una volta (la generazione RSA è lenta), la chiave AES viene generata per ogni file
- Ogni file memorizza: contenuto crittografato + chiave privata crittografata (copiata dalle impostazioni) + salt
- I file sono autonomi — decrittografabili solo con la password, senza dipendenza dal plugin

<details>
<summary>Script Python di decrittografia (clicca per espandere)</summary>

```python
#!/usr/bin/env python3
"""Decrittografare file LLM Hub senza il plugin."""
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
        raise ValueError("Formato file crittografato non valido")

    frontmatter, encrypted_data = match.groups()
    key_match = re.search(r'key:\s*(.+)', frontmatter)
    salt_match = re.search(r'salt:\s*(.+)', frontmatter)
    if not key_match or not salt_match:
        raise ValueError("Key o salt mancante nel frontmatter")

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
        print(f"Uso: {sys.argv[0]} <file_crittografato>")
        sys.exit(1)
    password = getpass.getpass("Password: ")
    print(decrypt_file(sys.argv[1], password))
```

Richiede: `pip install cryptography`

</details>

> **Avvertenza:** Se dimentichi la password, i file crittografati non possono essere recuperati. Conserva la password in modo sicuro.

> **Suggerimento:** Per crittografare tutti i file in una directory contemporaneamente, usa un workflow. Vedi l'esempio "Crittografa tutti i file in una directory" in [WORKFLOW_NODES_it.md](docs/WORKFLOW_NODES_it.md#obsidian-command).

![Flusso di Crittografia File](docs/images/enc.png)

**Vantaggi di sicurezza:**
- **Protetto dalla chat AI** - I file crittografati non possono essere letti dalle operazioni AI sul vault (strumento `read_note`). Questo mantiene i dati sensibili come le chiavi API al sicuro da esposizione accidentale durante la chat.
- **Accesso workflow con password** - I workflow possono leggere file crittografati usando il nodo `note-read`. Quando si accede, appare una finestra di dialogo per la password, e la password viene memorizzata nella cache per la sessione.
- **Archivia i segreti in sicurezza** - Invece di scrivere le chiavi API direttamente nei workflow, archiviale in file crittografati. Il workflow legge la chiave in fase di esecuzione dopo la verifica della password.

### Ricerca Semantica (RAG)

Ricerca vettoriale locale che inietta contenuto pertinente del vault nelle conversazioni LLM. Nessun server RAG esterno richiesto — gli embedding vengono generati e memorizzati localmente.

**Configurazione:**

1. Vai in Impostazioni → sezione RAG
2. Crea una nuova impostazione RAG (clicca `+`)
3. Configura l'embedding:
   - **Predefinito (Gemini):** Lascia Embedding Base URL vuoto — usa l'API Gemini Embedding con la tua chiave API Gemini
   - **Server personalizzato (Ollama ecc.):** Imposta Embedding Base URL e seleziona un modello
4. Clicca **Sync** per costruire l'indice vettoriale dal tuo vault
5. Seleziona l'impostazione RAG nel menu a tendina per attivarla

| Impostazione | Descrizione | Predefinito |
|-------------|-------------|-------------|
| **Embedding Base URL** | URL del server di embedding personalizzato (vuoto = API Gemini) | vuoto |
| **Embedding API Key** | Chiave API per il server personalizzato (vuoto = chiave Gemini) | vuoto |
| **Embedding Model** | Nome del modello per la generazione di embedding | `gemini-embedding-2-preview` |
| **Chunk Size** | Caratteri per chunk | 500 |
| **Chunk Overlap** | Sovrapposizione tra i chunk | 100 |
| **Pagine PDF per frammento** | Numero di pagine PDF per frammento di embedding (1–6) | 6 |
| **Top K** | Numero massimo di chunk da recuperare per query | 5 |
| **Score Threshold** | Punteggio di similarità minimo (0.0–1.0) per includere nei risultati | 0.5 |
| **Target Folders** | Limita l'indicizzazione a cartelle specifiche (vuoto = tutte) | vuoto |
| **Exclude Patterns** | Pattern regex per escludere file dall'indicizzazione | vuoto |

> **Indicizzazione multimodale** (immagini, PDF, audio, video) viene abilitata automaticamente quando si utilizzano i modelli di embedding nativi Gemini (`gemini-embedding-*`). Nessuna configurazione manuale necessaria.

**Indice esterno:**

Usa un indice pre-costruito invece di sincronizzare dal vault:

1. Abilita il toggle **Usa indice esterno**
2. Imposta il percorso assoluto di una directory contenente `index.json` e `vectors.bin`
3. Opzionalmente imposta Embedding Base URL per l'embedding delle query (vuoto = API Gemini)
4. Il modello di embedding viene auto-rilevato dal file dell'indice

**Come funziona:** Quando RAG è attivo, ogni messaggio di chat attiva una ricerca vettoriale locale. I chunk pertinenti vengono iniettati nel prompt di sistema come contesto. Le fonti sono mostrate nell'interfaccia di chat — clicca per aprire la nota riferita.

### Scheda RAG Search

La scheda **RAG Search** fornisce un'interfaccia dedicata per cercare, filtrare, modificare e inviare i risultati RAG a Chat o Discussion.

![RAG Search](docs/images/rag-search.png)

- **Ricerca semantica** con Top K e soglia di punteggio regolabili
- **Filtro per parole chiave** per restringere i risultati dopo la ricerca
- **Editor di frammenti** con caricamento dei frammenti adiacenti (precedente/successivo) e rimozione della sovrapposizione
- **Invio a Chat o Discussion** — i risultati selezionati diventano allegati modificabili
- **Impostazioni indice** (icona ingranaggio) — configura dimensione dei frammenti, sovrapposizione, cartelle di destinazione, sincronizzazione e altro

> Per ulteriori dettagli, consulta la [Documentazione RAG Search](docs/RAG_SEARCH.md) ([日本語](docs/RAG_SEARCH_ja.md) | [中文](docs/RAG_SEARCH_zh.md) | [한국어](docs/RAG_SEARCH_ko.md) | [Français](docs/RAG_SEARCH_fr.md) | [Deutsch](docs/RAG_SEARCH_de.md) | [Español](docs/RAG_SEARCH_es.md) | [Português](docs/RAG_SEARCH_pt.md) | [Italiano](docs/RAG_SEARCH_it.md))

### AI Discussion

La scheda **Discussion** offre un'arena di dibattito multi-modello in cui diversi modelli AI discutono un argomento in parallelo, traggono conclusioni e votano per la risposta migliore.

![AI Discussion](docs/images/ai-discussion.png)

**Come funziona:**

1. Apri la scheda **Discussion**
2. Inserisci un tema di discussione
3. Aggiungi partecipanti — scegli qualsiasi modello disponibile (API, CLI, Local LLM) o User
4. Assegna facoltativamente dei ruoli ai partecipanti (es. "Affermativo", "Critico")
5. Imposta il numero di turni
6. Clicca **Start Discussion**

![Discussion Setup](docs/images/ai-discussion-start.png)

**Flusso della discussione:**

1. **Turni di discussione** — Tutti i partecipanti rispondono in parallelo. Ogni turno si basa sulle risposte precedenti.
2. **Conclusione** — Nell'ultimo turno, ogni partecipante fornisce la propria conclusione.
3. **Votazione** — I partecipanti votanti valutano tutte le conclusioni e votano per la migliore.
4. **Risultato** — Viene annunciato il vincitore (o il pareggio). Salva la trascrizione completa come nota Markdown.

![Voting Results](docs/images/ai-discussion-voting.png)

**Funzionalità:**

- **Qualsiasi modello come partecipante** — Combina liberamente i modelli (es. Gemini vs Claude vs GPT)
- **Partecipazione dell'utente** — Aggiungiti come partecipante o votante per discussioni con intervento umano
- **Assegnazione dei ruoli** — Assegna a ogni partecipante una prospettiva (es. "Ottimista", "Scettico")
- **Votanti separati** — I partecipanti votanti vengono sincronizzati automaticamente dai partecipanti alla discussione, ma possono essere personalizzati indipendentemente
- **Configurazione persistente** — Partecipanti e votanti vengono salvati e ripristinati tra le sessioni
- **Modale impostazioni** — Clicca l'icona ingranaggio (⚙️) per configurare prompt di sistema, prompt di conclusione, prompt di voto, cartella di output e turni predefiniti
- **Salva come nota** — Esporta la discussione completa (turni, conclusioni, voti, vincitore) come file Markdown

### Comandi Slash
- Definisci template di prompt personalizzati attivati con `/`
- Override opzionale di modello e ricerca per comando

![Comandi Slash](docs/images/setting_slash_command.png)

## Requisiti

- Obsidian v0.15.0+
- Almeno uno tra: chiave API (Gemini, OpenAI, Anthropic, OpenRouter, Grok), server LLM locale o strumento CLI
- Solo desktop (per mobile, vedi [Gemini Helper](https://github.com/takeshy/obsidian-gemini-helper))

## Privacy

**Dati memorizzati localmente:**
- Chiavi API (memorizzate nelle impostazioni Obsidian)
- Cronologia chat (come file Markdown, opzionalmente crittografati)
- Cronologia esecuzione workflow (opzionalmente crittografata)
- Indice vettoriale RAG (memorizzato nella cartella workspace)
- Chiavi di crittografia (chiave privata crittografata con la tua password)

**Dati inviati ai provider LLM:**
- I messaggi della chat e gli allegati vengono inviati al provider API configurato (Gemini, OpenAI, Anthropic, OpenRouter, Grok o endpoint personalizzato)
- Quando la Ricerca Web è abilitata (solo Gemini), le query vengono inviate a Google Search
- I provider LLM locali inviano dati solo al tuo server locale

**Dati inviati a servizi di terze parti:**
- I nodi `http` dei workflow possono inviare dati a qualsiasi URL specificato nel workflow

**Provider CLI (opzionali):**
- Quando la modalità CLI è abilitata, strumenti CLI esterni (gemini, claude, codex) vengono eseguiti tramite child_process
- Questo avviene solo quando esplicitamente configurato e verificato dall'utente
- La modalità CLI esegue strumenti CLI esterni tramite child_process

**Bot Discord (opzionale):**
- Quando abilitato, il plugin si connette a Discord tramite WebSocket Gateway e invia i messaggi degli utenti al provider LLM configurato
- Il token del bot è memorizzato nelle impostazioni di Obsidian
- Il contenuto dei messaggi dai canali Discord viene elaborato dal LLM — configura i canali/utenti consentiti per limitare l'accesso

**Server MCP (opzionali):**
- I server MCP (Model Context Protocol) possono essere configurati nelle impostazioni del plugin per i nodi `mcp` dei workflow
- I server MCP sono servizi esterni che forniscono strumenti e capacità aggiuntive

**Note sulla sicurezza:**
- Rivedi i workflow prima di eseguirli - i nodi `http` possono trasmettere dati del vault a endpoint esterni
- I nodi `note` dei workflow mostrano un dialogo di conferma prima di scrivere file (comportamento predefinito)
- I comandi slash con `confirmEdits: false` applicheranno automaticamente le modifiche ai file senza mostrare i pulsanti Applica/Annulla
- Credenziali sensibili: Non memorizzare chiavi API o token direttamente nel YAML del workflow (header `http`, impostazioni `mcp`, ecc.). Invece, conservali in file crittografati e usa il nodo `note-read` per recuperarli durante l'esecuzione. I workflow possono leggere file crittografati con richiesta di password.

Consulta i termini di servizio di ciascun provider per le politiche di conservazione dei dati.

## Licenza

MIT

## Link

- [Documentazione API Gemini](https://ai.google.dev/docs)
- [Documentazione API OpenAI](https://platform.openai.com/docs)
- [Documentazione API Anthropic](https://docs.anthropic.com)
- [Documentazione OpenRouter](https://openrouter.ai/docs)
- [Ollama](https://ollama.com)
- [Documentazione Plugin Obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## Supporto

Se trovi utile questo plugin, considera di offrirmi un caffè!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/takeshy)
