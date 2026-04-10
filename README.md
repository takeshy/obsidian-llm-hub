# LLM Hub for Obsidian

[![DeepWiki](https://img.shields.io/badge/DeepWiki-takeshy%2Fobsidian--llm--hub-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTloMTZhMiAyIDAgMCAwIDItMlY3YTIgMiAwIDAgMC0yLTJINWEyIDIgMCAwIDAtMiAydjEyYTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTkgMTV2LTQiLz48cGF0aCBkPSJNMTIgMTV2LTIiLz48cGF0aCBkPSJNMTUgMTV2LTQiLz48L3N2Zz4=)](https://deepwiki.com/takeshy/obsidian-llm-hub)

**Free and open-source** AI assistant for Obsidian with **Chat**, **Workflow Automation**, and **Semantic Search (RAG)**. Supports multiple LLM providers — use whichever AI fits your needs.

> **Use any LLM provider:** [Gemini](https://ai.google.dev), [OpenAI](https://platform.openai.com), [Anthropic](https://console.anthropic.com), [OpenRouter](https://openrouter.ai), [Grok](https://console.x.ai), local LLMs ([Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), [vLLM](https://docs.vllm.ai)), or CLI tools ([Gemini CLI](https://github.com/google-gemini/gemini-cli), [Claude Code](https://github.com/anthropics/claude-code), [Codex CLI](https://github.com/openai/codex)).

## Highlights

- **Multi-Provider LLM Chat** - Use Gemini, OpenAI, Anthropic, OpenRouter, Grok, local LLMs, or CLI backends
- **Vault Operations** - AI reads, writes, searches, and edits your notes with function calling (Gemini, OpenAI, Anthropic)
- **Workflow Builder** - Automate multi-step tasks with visual node editor and 25 node types
- **Semantic Search (RAG)** - Local vector search with dedicated search tab, PDF preview, and result-to-chat flow
- **AI Discussion** - Multi-model debate arena with parallel responses, voting, and winner determination
- **Edit History** - Track and restore AI-made changes with diff view
- **Web Search** - Access up-to-date information via Google Search (Gemini)
- **Image Generation** - Create images with Gemini or DALL-E
- **Discord Integration** - Connect your LLM to Discord as a chat bot with per-channel model/RAG switching
- **Encryption** - Password-protect chat history and workflow execution logs


## Supported Providers

| Provider | Chat | Vault Tools | Web Search | Image Gen | RAG |
|----------|------|-------------|------------|-----------|-----|
| **Gemini** (API) | ✅ Streaming | ✅ Function calling | ✅ Google Search | ✅ Gemini Image models | ✅ |
| **OpenAI** (API) | ✅ Streaming | ✅ Function calling | ❌ | ✅ DALL-E | ✅ |
| **Anthropic** (API) | ✅ Streaming | ✅ Tool use | ❌ | ❌ | ✅ |
| **OpenRouter** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **Grok** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **Local LLM** (Ollama, LM Studio, vLLM) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |
| **CLI** (Gemini, Claude, Codex) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |

> [!TIP]
> **Multiple providers can be configured simultaneously.** Switch models freely during chat — each provider has its own API key and settings.

> [!TIP]
> **CLI Options** let you use flagship models with just an account - no API key needed!
> - **Gemini CLI**: Install [Gemini CLI](https://github.com/google-gemini/gemini-cli), run `gemini` and authenticate with `/auth`
> - **Claude CLI**: Install [Claude Code](https://github.com/anthropics/claude-code) (`npm install -g @anthropic-ai/claude-code`), run `claude` and authenticate
> - **Codex CLI**: Install [Codex CLI](https://github.com/openai/codex) (`npm install -g @openai/codex`), run `codex` and authenticate

### Gemini Free API Key Tips

- **Rate limits** are per-model and reset daily. Switch models to continue working.
- **Gemma models** and **Gemini CLI** don't support vault operations in Chat, but **Workflows can still read/write notes** using `note`, `note-read`, and other node types. `{content}` and `{selection}` variables also work.

---

# AI Chat

The AI Chat feature provides an interactive conversation interface with your chosen LLM provider, integrated with your Obsidian vault.

![Chat Interface](docs/images/chat.png)

**Opening Chat:**
- Click chat icon in ribbon
- Command: "LLM Hub: Open chat"
- Toggle: "LLM Hub: Toggle chat / editor"

**Chat Controls:**
- **Enter** - Send message
- **Shift+Enter** - New line
- **Stop button** - Stop generation
- **+ button** - New chat
- **History button** - Load previous chats

## Slash Commands

Create reusable prompt templates triggered by `/`:

- Define templates with `{selection}` (selected text) and `{content}` (active note)
- Optional model and search override per command
- Type `/` to see available commands

**Default:** `/infographic` - Converts content to HTML infographic

![Infographic Example](docs/images/chat_infographic.png)

## @ Mentions

Reference files and variables by typing `@`:

- `{selection}` - Selected text
- `{content}` - Active note content
- Any vault file - Browse and insert (path only; AI reads content via tools)

> [!NOTE]
> **How `{selection}` and `{content}` work:** When you switch from Markdown View to Chat View, the selection would normally be cleared due to focus change. To preserve your selection, the plugin captures it when switching views and highlights the selected area with a background color in the Markdown View. The `{selection}` option only appears in @ suggestions when text was selected.
>
> Both `{selection}` and `{content}` are intentionally **not expanded** in the input area—since the chat input is compact, expanding long text would make typing difficult. The content is expanded when you send the message, which you can verify by checking your sent message in the chat.

> [!NOTE]
> Vault file @mentions insert only the file path - the AI reads content via tools. This doesn't work with Gemma models (no vault tool support). Gemini CLI can read files via shell, but response format may differ.

## File Attachments

Attach files directly: Images (PNG, JPEG, GIF, WebP), PDFs, Text files

## Function Calling (Vault Operations)

The AI can interact with your vault using these tools:

| Tool | Description |
|------|-------------|
| `read_note` | Read note content |
| `create_note` | Create new notes |
| `propose_edit` | Edit with confirmation dialog |
| `propose_delete` | Delete with confirmation dialog |
| `bulk_propose_edit` | Bulk edit multiple files with selection dialog |
| `bulk_propose_delete` | Bulk delete multiple files with selection dialog |
| `search_notes` | Search vault by name or content |
| `list_notes` | List notes in folder |
| `rename_note` | Rename/move notes |
| `create_folder` | Create new folders |
| `list_folders` | List folders in vault |
| `get_active_note_info` | Get info about active note |
| `bulk_propose_rename` | Bulk rename multiple files with selection dialog |

### Vault Tool Mode

When the AI handles notes in Chat, it uses Vault tools. Control which vault tools the AI can use via the Database icon (📦) below the attachment button:

| Mode | Description | Tools Available |
|------|-------------|-----------------|
| **Vault: All** | Full vault access | All tools |
| **Vault: No search** | Exclude search tools | All except `search_notes`, `list_notes` |
| **Vault: Off** | No vault access | None |

**When to use each mode:**

- **Vault: All** - Default mode for general use. The AI can read, write, and search your vault.
- **Vault: No search** - Use when you already know the target file. This avoids redundant vault searches, saving tokens and improving response time.
- **Vault: Off** - Use when you don't need vault access at all.

**Automatic mode selection:**

| Condition | Default Mode | Changeable |
|-----------|--------------|------------|
| CLI models (Gemini/Claude/Codex CLI) | Vault: Off | No |
| Gemma models | Vault: Off | No |
| Web Search enabled | Vault: Off | No |
| Normal | Vault: All | Yes |

**Why some modes are forced:**

- **CLI/Gemma models**: These models do not support function calling, so Vault tools cannot be used.
- **Web Search**: By design, Vault tools are disabled when Web Search is enabled.

## Safe Editing

When AI uses `propose_edit`:
1. A confirmation dialog shows the proposed changes
2. Click **Apply** to write changes to the file
3. Click **Discard** to cancel without modifying the file

> Changes are NOT written until you confirm.

## Edit History

Track and restore changes made to your notes:

- **Automatic tracking** - All AI edits (chat, workflow) and manual changes are recorded
- **File menu access** - Right-click on a markdown file to access:
  - **Snapshot** - Save current state as a snapshot
  - **History** - Open edit history modal


- **Command palette** - Also available via "Show edit history" command
- **Diff view** - See exactly what changed with color-coded additions/deletions
- **Restore** - Revert to any previous version with one click
- **Copy** - Save a historical version as a new file (default name: `{filename}_{datetime}.md`)
- **Resizable modal** - Drag to move, resize from corners

**Diff display:**
- `+` lines existed in the older version
- `-` lines were added in the newer version

**How it works:**

Edit history uses a snapshot-based approach:

1. **Snapshot creation** - When a file is first opened or modified by AI, a snapshot of its content is saved
2. **Diff recording** - When the file is modified, the difference between the new content and the snapshot is recorded as a history entry
3. **Snapshot update** - The snapshot is updated to the new content after each modification
4. **Restore** - To restore to a previous version, diffs are applied in reverse from the snapshot

**When history is recorded:**
- AI chat edits (`propose_edit` tool)
- Workflow note modifications (`note` node)
- Manual saves via command
- Auto-detection when file differs from snapshot on open

**Storage:** Edit history is stored in memory and cleared on Obsidian restart. Obsidian's built-in file recovery covers persistent version tracking.

![Edit History Modal](docs/images/edit_history.png)

## MCP Servers

MCP (Model Context Protocol) servers provide additional tools that extend the AI's capabilities beyond vault operations.

**Two transport modes are supported:**

**HTTP (Streamable HTTP):**

1. Open plugin settings → **MCP Servers** section
2. Click **Add server** → select **HTTP**
3. Enter server name and URL
4. Configure optional headers (JSON format) for authentication
5. Click **Test connection** to verify and retrieve available tools
6. Save the server configuration

**Stdio (Local process):**

1. Open plugin settings → **MCP Servers** section
2. Click **Add server** → select **Stdio**
3. Enter server name and command (e.g., `npx -y @modelcontextprotocol/server-filesystem /path/to/dir`)
4. Configure optional environment variables (JSON format)
5. Click **Test connection** to verify and retrieve available tools
6. Save the server configuration

> **Note:** Stdio transport launches a local process and is desktop-only. Test connection is required before saving.

![MCP Server Settings](docs/images/setting_mcp.png)

**Using MCP tools:**

- **In Chat:** Click the Database icon (📦) to open tool settings. Enable/disable MCP servers per conversation.
- **In Workflows:** Use the `mcp` node to call MCP server tools.

**Tool hints:** After successful connection test, available tool names are saved and displayed in both settings and chat UI for easy reference.

### MCP Apps (Interactive UI)

Some MCP tools return interactive UI that allows you to interact with the tool results visually. This feature is based on the [MCP Apps specification](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/mcp_apps).


**How it works:**

- When an MCP tool returns a `ui://` resource URI in its response metadata, the plugin fetches and renders the HTML content
- The UI is displayed in a sandboxed iframe for security (`sandbox="allow-scripts allow-forms"`)
- Interactive apps can call additional MCP tools and update context through a JSON-RPC bridge

**In Chat:**
- MCP Apps appear inline in assistant messages with an expand/collapse button
- Click ⊕ to expand the app to full screen, ⊖ to collapse

**In Workflows:**
- MCP Apps are displayed in a modal dialog during workflow execution
- The workflow pauses to allow user interaction, then continues when the modal is closed

> **Security:** All MCP App content runs in a sandboxed iframe with restricted permissions. The iframe cannot access the parent page's DOM, cookies, or local storage. Only `allow-scripts` and `allow-forms` are enabled.

## Agent Skills

Extend the AI with custom instructions, reference materials, and executable workflows. Skills follow the industry-standard agent skills pattern (e.g., [OpenAI Codex](https://github.com/openai/codex) `.codex/skills/`).

- **Built-in skills** - Obsidian-specific knowledge (Markdown, Canvas, Bases) included out of the box. Based on [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
- **Custom instructions** - Define domain-specific behavior via `SKILL.md` files
- **Reference materials** - Include style guides, templates, and checklists in `references/`
- **Workflow integration** - Skills can expose workflows as function calling tools
- **Script execution** - Skills can expose scripts (`.sh`, `.py`, `.js`, `.ts`, `.rb`) as function calling tools (desktop only)
- **Slash command** - Type `/folder-name` to instantly invoke a skill and send
- **CLI mode support** - Skills work with Gemini CLI, Claude CLI, and Codex CLI backends
- **Selective activation** - Choose which skills are active per conversation

Create skills the same way as workflows — select **+ New (AI)**, check **"Create as agent skill"**, and describe what you want. The AI generates both the `SKILL.md` instructions and the workflow.

> **For setup instructions and examples, see [SKILLS.md](docs/SKILLS.md)**

---

# Discord Integration

Connect your Obsidian vault's LLM to Discord as a chat bot. Users can chat with the AI, switch models, use RAG search, and activate slash commands — all from Discord.

## Setup

### 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → enter a name → **Create**
3. Go to **Bot** in the left sidebar
4. Click **Reset Token** → copy the bot token (you'll need this later)
5. Under **Privileged Gateway Intents**, enable **Message Content Intent** (required to read message text)

### 2. Invite the Bot to Your Server

1. Go to **OAuth2** in the left sidebar
2. Under **OAuth2 URL Generator**, select the **bot** scope
3. Under **Bot Permissions**, select:
   - **Send Messages**
   - **Read Message History**
4. Copy the generated URL and open it in your browser
5. Select a server and authorize the bot

### 3. Configure in Obsidian

1. Open plugin settings → **Discord** section
2. Enable **Discord Bot**
3. Paste the bot token
4. Click **Connect** (the plugin verifies the token before connecting)
5. The status indicator shows whether the bot is connected

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| **Enabled** | Toggle Discord bot on/off | Off |
| **Bot Token** | Discord bot token from Developer Portal | — |
| **Respond to DMs** | Whether the bot responds to direct messages | On |
| **Require @mention** | In server channels, only respond when @mentioned (DMs always respond) | On |
| **Allowed Channel IDs** | Comma-separated channel IDs to restrict (empty = all channels) | empty |
| **Allowed User IDs** | Comma-separated user IDs to restrict (empty = all users) | empty |
| **Model Override** | Specify which model to use for Discord (empty = current selected model) | empty |
| **System Prompt Override** | Custom system prompt for Discord conversations | empty |
| **Max Response Length** | Maximum characters per message (1–2000, Discord's limit) | 2000 |

> [!TIP]
> **Finding Channel/User IDs:** In Discord, enable **Developer Mode** (Settings → Advanced → Developer Mode). Then right-click a channel or user and select **Copy ID**.

## Bot Commands

Users can interact with the bot using these commands in Discord:

| Command | Description |
|---------|-------------|
| `!model` | List available models |
| `!model <name>` | Switch to a specific model for this channel |
| `!rag` | List available RAG settings |
| `!rag <name>` | Switch to a specific RAG setting for this channel |
| `!rag off` | Disable RAG for this channel |
| `!skill` | List available slash commands |
| `!skill <name>` | Activate a slash command (may require follow-up message) |
| `!research <query>` | Run Gemini Deep Research (background, may take several minutes) |
| `!discuss <theme>` | Start AI Discussion with configured participants (background) |
| `!reset` | Clear conversation history for this channel |
| `!help` | Show help message |

## Features

- **Multi-provider support** — Works with all configured LLM providers (Gemini, OpenAI, Anthropic, OpenRouter, Grok, CLI, Local LLM)
- **Per-channel state** — Each Discord channel maintains its own conversation history, model selection, and RAG setting
- **Vault tools** — AI has full access to vault tools (read, write, search notes) based on your plugin settings
- **RAG integration** — Semantic search can be enabled per channel via `!rag` command
- **Slash commands** — Activate plugin slash commands via `!skill`
- **Deep Research** — Run Gemini Deep Research via `!research` command. Runs in the background so you can continue chatting while it works. Results are posted to the channel when complete (requires Gemini API key)
- **Long message splitting** — Responses exceeding Discord's 2000-char limit are automatically split at natural break points
- **Conversation memory** — Per-channel history (max 20 messages, 30-minute TTL)
- **Auto-reconnect** — Recovers from connection drops with exponential backoff

> [!NOTE]
> Conversation history is kept in memory only and is cleared when the bot disconnects or Obsidian restarts.

---

# Workflow Builder

Build automated multi-step workflows directly in Markdown files. **No programming knowledge required** - just describe what you want in natural language, and the AI will create the workflow for you.

![Visual Workflow Editor](docs/images/visual_workflow.png)

## AI-Powered Workflow & Skill Creation

**You don't need to learn YAML syntax or node types.** Simply describe your workflow in plain language:

1. Open the **Workflow** tab in the plugin sidebar
2. Select **+ New (AI)** from the dropdown
3. Describe what you want: *"Create a workflow that summarizes the selected note and saves it to a summaries folder"*
4. Check **"Create as agent skill"** if you want to create an agent skill instead of a standalone workflow
5. Click **Generate** - the AI creates the complete workflow

![Create Workflow with AI](docs/images/create_workflow_with_ai.png)

**Modify existing workflows the same way:**
1. Load any workflow
2. Click the **AI Modify** button
3. Describe changes: *"Add a step to translate the summary to Japanese"*
4. Review and apply


## Available Node Types

25 node types are available for building workflows:

| Category | Nodes |
|----------|-------|
| Variables | `variable`, `set` |
| Control | `if`, `while` |
| LLM | `command` |
| Data | `http`, `json`, `script`, `shell` |
| Notes | `note`, `note-read`, `note-search`, `note-list`, `folder-list`, `open` |
| Files | `file-explorer`, `file-save` |
| Prompts | `prompt-file`, `prompt-selection`, `dialog` |
| Composition | `workflow` |
| External | `mcp`, `obsidian-command` |
| RAG | `rag-sync` |
| Utility | `sleep` |

> **For detailed node specifications and examples, see [WORKFLOW_NODES.md](docs/WORKFLOW_NODES.md)**

## Hotkey Mode

Assign keyboard shortcuts to run workflows instantly:

1. Add a `name:` field to your workflow
2. Open the workflow file and select the workflow from dropdown
3. Click the keyboard icon (⌨️) in the Workflow panel footer
4. Go to Settings → Hotkeys → search "Workflow: [Your Workflow Name]"
5. Assign a hotkey (e.g., `Ctrl+Shift+T`)

When triggered by hotkey:
- `prompt-file` uses the active file automatically (no dialog)
- `prompt-selection` uses the current selection, or full file content if no selection

## Event Triggers

Workflows can be automatically triggered by Obsidian events:

![Event Trigger Settings](docs/images/event_setting.png)

| Event | Description |
|-------|-------------|
| File Created | Triggered when a new file is created |
| File Modified | Triggered when a file is saved (debounced 5s) |
| File Deleted | Triggered when a file is deleted |
| File Renamed | Triggered when a file is renamed |
| File Opened | Triggered when a file is opened |

**Event trigger setup:**
1. Add a `name:` field to your workflow
2. Open the workflow file and select the workflow from dropdown
3. Click the zap icon (⚡) in the Workflow panel footer
4. Select which events should trigger the workflow
5. Optionally add a file pattern filter

**File pattern examples:**
- `**/*.md` - All Markdown files in any folder
- `journal/*.md` - Markdown files in journal folder only
- `*.md` - Markdown files in root folder only
- `**/{daily,weekly}/*.md` - Files in daily or weekly folders
- `projects/[a-z]*.md` - Files starting with lowercase letter

**Event variables:** When triggered by an event, these variables are set automatically:

| Variable | Description |
|----------|-------------|
| `_eventType` | Event type: `create`, `modify`, `delete`, `rename`, `file-open` |
| `_eventFilePath` | Path of the affected file |
| `_eventFile` | JSON with file info (path, basename, name, extension) |
| `_eventFileContent` | File content (for create/modify/file-open events) |
| `_eventOldPath` | Previous path (for rename events only) |

> **Note:** `prompt-file` and `prompt-selection` nodes automatically use the event file when triggered by events. `prompt-selection` uses the entire file content as the selection.

---

# Common

## Supported Models

### Gemini

| Model | Description |
|-------|-------------|
| Gemini 3.1 Pro Preview | Latest flagship model, 1M context (recommended) |
| Gemini 3.1 Pro Preview (Custom Tools) | Optimized for agentic workflows with custom tools and bash |
| Gemini 3 Flash Preview | Fast model, 1M context, best cost-performance |
| Gemini 3.1 Flash Lite Preview | Most cost-effective model with high performance |
| Gemini 2.5 Flash | Fast model, 1M context |
| Gemini 2.5 Pro | Pro model, 1M context |
| Gemini 3 Pro (Image) | Pro image generation, 4K |
| Gemini 3.1 Flash (Image) | Fast, low-cost image generation |
| Gemma 3 (27B/12B/4B/1B) | Free, no vault tool support |

> **Thinking mode:** Use the **Always Think** toggles for supported chat models. **Gemini 3.1 Pro** always uses thinking mode and does not support disabling it.

**Always Think toggle:**

Click the Database icon (📦) to open the tool menu, and check the toggles under **Always Think**:

- **Flash** — OFF by default. Check to always enable thinking for Flash models.
- **Flash Lite** — ON by default. Flash Lite has minimal cost and speed difference with thinking enabled, so it is recommended to keep this on.

When a toggle is ON, thinking is always active for that model family regardless of message content. When OFF, the existing keyword-based detection is used.

![Always Think Settings](docs/images/setting_thinking.png)

### OpenAI

| Model | Description |
|-------|-------------|
| GPT-5.4 | Latest flagship model |
| GPT-5.4-mini | Cost-effective mid-tier model |
| GPT-5.4-nano | Lightweight, fast model |
| O3 | Reasoning model |
| DALL-E 3 / DALL-E 2 | Image generation |

### Anthropic

| Model | Description |
|-------|-------------|
| Claude Opus 4.6 | Most capable model, extended thinking |
| Claude Sonnet 4.6 | Balanced performance and cost |
| Claude Haiku 4.5 | Fast, lightweight model |

### OpenRouter / Grok / Custom

Configure any OpenAI-compatible endpoint with custom base URL and models. OpenRouter provides access to hundreds of models from various providers.

### Local LLM

Connect to locally running models via Ollama, LM Studio, vLLM, or AnythingLLM. Models are auto-detected from the running server.

## Installation

### BRAT (Recommended)
1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Open BRAT settings → "Add Beta plugin"
3. Enter: `https://github.com/takeshy/obsidian-llm-hub`
4. Enable the plugin in Community plugins settings

### Manual
1. Download `main.js`, `manifest.json`, `styles.css` from releases
2. Create `llm-hub` folder in `.obsidian/plugins/`
3. Copy files and enable in Obsidian settings

### From Source
```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

## Configuration

### API Providers

Add one or more API providers in plugin settings. Each provider has its own API key and model selection.

| Provider | Get API Key |
|----------|-------------|
| Gemini | [ai.google.dev](https://ai.google.dev) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) |
| OpenRouter | [openrouter.ai](https://openrouter.ai) |
| Grok | [console.x.ai](https://console.x.ai) |

You can also add custom OpenAI-compatible endpoints.

![Basic Settings](docs/images/setting_basic.png)

### Proxy

Route all API requests through an HTTP CONNECT proxy for corporate gateway environments. See [Proxy Settings](docs/PROXY.md) for details.

### Local LLM

Connect to locally running LLM servers:

1. Start your local server (Ollama, LM Studio, vLLM, or AnythingLLM)
2. Enter the server URL in plugin settings
3. Click "Verify" to detect available models

> [!NOTE]
> Local LLMs do not support function calling (vault tools). Use workflows for note operations.

### CLI Mode (Gemini / Claude / Codex)

**Gemini CLI:**
1. Install [Gemini CLI](https://github.com/google-gemini/gemini-cli)
2. Authenticate with `gemini` → `/auth`
3. Click "Verify" in Gemini CLI section

**Claude CLI:**
1. Install [Claude Code](https://github.com/anthropics/claude-code): `npm install -g @anthropic-ai/claude-code`
2. Authenticate with `claude`
3. Click "Verify" in Claude CLI section

**Codex CLI:**
1. Install [Codex CLI](https://github.com/openai/codex): `npm install -g @openai/codex`
2. Authenticate with `codex`
3. Click "Verify" in Codex CLI section

**CLI Limitations:** No vault tool support, no web search, desktop only

> [!NOTE]
> **CLI-only usage:** You can use CLI mode without any API key. Just install and verify a CLI tool.

**Custom CLI Path:** If automatic CLI detection fails, click the gear icon (⚙️) next to the Verify button to manually specify the CLI path. The plugin searches common installation paths automatically, including version managers (nodenv, nvm, volta, fnm, asdf, mise).

<details>
<summary><b>Windows: How to find the CLI path</b></summary>

1. Open PowerShell and run:
   ```powershell
   Get-Command gemini
   ```
2. This shows the script path (e.g., `C:\Users\YourName\AppData\Roaming\npm\gemini.ps1`)
3. Navigate from the `npm` folder to the actual `index.js`:
   ```
   C:\Users\YourName\AppData\Roaming\npm\node_modules\@google\gemini-cli\dist\index.js
   ```
4. Enter this full path in the CLI path settings

For Claude CLI, use `Get-Command claude` and navigate to `node_modules\@anthropic-ai\claude-code\dist\index.js`.
</details>

<details>
<summary><b>macOS / Linux: How to find the CLI path</b></summary>

1. Open a terminal and run:
   ```bash
   which gemini
   ```
2. Enter the displayed path (e.g., `/home/user/.local/bin/gemini`) in the CLI path settings

For Claude CLI, use `which claude`. For Codex CLI, use `which codex`.

**Node.js version managers:** If you use nodenv, nvm, volta, fnm, asdf, or mise, the plugin automatically detects the node binary from common locations. If detection fails, specify the CLI script path directly (e.g., `~/.npm-global/lib/node_modules/@google/gemini-cli/dist/index.js`).
</details>

> [!TIP]
> **Claude CLI tip:** Chat sessions from LLM Hub are stored locally. You can continue conversations outside of Obsidian by running `claude --resume` in your vault directory to see and resume past sessions.

### Workspace Settings
- **Workspace Folder** - Chat history and settings location
- **System Prompt** - Additional AI instructions
- **Tool Limits** - Control function call limits
- **Edit History** - Track and restore AI-made changes

![Tool Limits & Edit History](docs/images/setting_tool_history.png)

### Encryption

Password-protect your chat history and workflow execution logs separately.

**Setup:**

1. Set a password in plugin settings (stored securely using public-key cryptography)

![Initial Encryption Setup](docs/images/setting_initial_encryption.png)

2. After setup, toggle encryption for each log type:
   - **Encrypt AI chat history** - Encrypt chat conversation files
   - **Encrypt workflow execution logs** - Encrypt workflow history files

![Encryption Settings](docs/images/setting_encryption.png)

Each setting can be enabled/disabled independently.

**Features:**
- **Separate controls** - Choose which logs to encrypt (chat, workflow, or both)
- **Automatic encryption** - New files are encrypted when saved based on settings
- **Password caching** - Enter password once per session
- **Dedicated viewer** - Encrypted files open in a secure editor with preview
- **Decrypt option** - Remove encryption from individual files when needed

**How it works:**

```
[Setup - once when setting password]
Password → Generate key pair (RSA) → Encrypt private key → Store in settings

[Encryption - for each file]
File content → Encrypt with new AES key → Encrypt AES key with public key
→ Save to file: encrypted data + encrypted private key (from settings) + salt

[Decryption]
Password + salt → Restore private key → Decrypt AES key → Decrypt file content
```

- Key pair is generated once (RSA generation is slow), AES key is generated per file
- Each file stores: encrypted content + encrypted private key (copied from settings) + salt
- Files are self-contained — decryptable with just the password, no plugin dependency

<details>
<summary>Python decryption script (click to expand)</summary>

```python
#!/usr/bin/env python3
"""Decrypt LLM Hub encrypted files without the plugin."""
import base64, sys, re, getpass
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import padding

def decrypt_file(filepath: str, password: str) -> str:
    with open(filepath, 'r') as f:
        content = f.read()

    # Parse YAML frontmatter
    match = re.match(r'^---\n([\s\S]*?)\n---\n([\s\S]*)$', content)
    if not match:
        raise ValueError("Invalid encrypted file format")

    frontmatter, encrypted_data = match.groups()
    key_match = re.search(r'key:\s*(.+)', frontmatter)
    salt_match = re.search(r'salt:\s*(.+)', frontmatter)
    if not key_match or not salt_match:
        raise ValueError("Missing key or salt in frontmatter")

    enc_private_key = base64.b64decode(key_match.group(1).strip())
    salt = base64.b64decode(salt_match.group(1).strip())
    data = base64.b64decode(encrypted_data.strip())

    # Derive key from password
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100000)
    derived_key = kdf.derive(password.encode())

    # Decrypt private key
    iv, enc_priv = enc_private_key[:12], enc_private_key[12:]
    private_key_pem = AESGCM(derived_key).decrypt(iv, enc_priv, None)
    private_key = serialization.load_der_private_key(base64.b64decode(private_key_pem), None)

    # Parse encrypted data: key_length(2) + enc_aes_key + iv(12) + enc_content
    key_len = (data[0] << 8) | data[1]
    enc_aes_key = data[2:2+key_len]
    content_iv = data[2+key_len:2+key_len+12]
    enc_content = data[2+key_len+12:]

    # Decrypt AES key with RSA private key
    aes_key = private_key.decrypt(enc_aes_key, padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))

    # Decrypt content
    return AESGCM(aes_key).decrypt(content_iv, enc_content, None).decode('utf-8')

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <encrypted_file>")
        sys.exit(1)
    password = getpass.getpass("Password: ")
    print(decrypt_file(sys.argv[1], password))
```

Requires: `pip install cryptography`

</details>

> **Warning:** If you forget your password, encrypted files cannot be recovered. Keep your password safe.

> **Tip:** To encrypt all files in a directory at once, use a workflow. See the "Encrypt all files in a directory" example in [WORKFLOW_NODES.md](docs/WORKFLOW_NODES.md#obsidian-command).

![File Encryption Workflow](docs/images/enc.png)

**Security benefits:**
- **Protected from AI chat** - Encrypted files cannot be read by AI vault operations (`read_note` tool). This keeps sensitive data like API keys safe from accidental exposure during chat.
- **Workflow access with password** - Workflows can read encrypted files using the `note-read` node. When accessed, a password dialog appears, and the password is cached for the session.
- **Store secrets safely** - Instead of writing API keys directly in workflows, store them in encrypted files. The workflow reads the key at runtime after password verification.

### Semantic Search (RAG)

Local vector-based search that injects relevant vault content into LLM conversations. No external RAG server required — embeddings are generated and stored locally.

**Setup:**

1. Go to Settings → RAG section
2. Create a new RAG setting (click `+`)
3. Configure embedding:
   - **Default (Gemini):** Leave Embedding Base URL empty — uses Gemini Embedding API with your Gemini API key
   - **Custom server (Ollama etc.):** Set Embedding Base URL and select a model
4. Click **Sync** to build the vector index from your vault
5. Select the RAG setting in the dropdown to activate it

| Setting | Description | Default |
|---------|-------------|---------|
| **Embedding Base URL** | Custom embedding server URL (empty = Gemini API) | empty |
| **Embedding API Key** | API key for custom server (empty = Gemini key) | empty |
| **Embedding Model** | Model name for embedding generation | `gemini-embedding-2-preview` |
| **Chunk Size** | Characters per chunk | 500 |
| **Chunk Overlap** | Overlap between chunks | 100 |
| **PDF Chunk Pages** | Number of PDF pages per embedding chunk (1–6) | 6 |
| **Top K** | Max chunks to retrieve per query | 5 |
| **Score Threshold** | Minimum similarity score (0.0–1.0) to include in results | 0.5 |
| **Target Folders** | Limit indexing to specific folders (empty = all) | empty |
| **Exclude Patterns** | Regex patterns to exclude files from indexing | empty |

> **Multimodal indexing** (images, PDFs, audio, video) is automatically enabled when using Gemini native embedding models (`gemini-embedding-*`). No manual configuration needed.

**External Index:**

Use a pre-built index instead of syncing from the vault:

1. Enable **Use external index** toggle
2. Set the absolute path to a directory containing `index.json` and `vectors.bin`
3. Optionally set Embedding Base URL for query embedding (empty = Gemini API)
4. The embedding model is auto-detected from the index file

**How it works:** When RAG is active, each chat message triggers a local vector search. Relevant chunks are injected into the system prompt as context. Sources are shown in the chat UI — click to open the referenced note.

### RAG Search Tab

The **RAG Search** tab provides a dedicated interface for searching, filtering, editing, and sending RAG results to Chat or Discussion.

![RAG Search](docs/images/rag-search.png)

- **Semantic search** with adjustable Top K and score threshold
- **Keyword filter** to narrow results after search
- **Chunk editor** with adjacent chunk loading (prev/next) and overlap removal
- **Send to Chat or Discussion** — selected results become editable attachments
- **Index settings** (gear icon) — configure chunk size, overlap, target folders, sync, and more

> For full details, see [RAG Search Documentation](docs/RAG_SEARCH.md) ([日本語](docs/RAG_SEARCH_ja.md) | [中文](docs/RAG_SEARCH_zh.md) | [한국어](docs/RAG_SEARCH_ko.md) | [Français](docs/RAG_SEARCH_fr.md) | [Deutsch](docs/RAG_SEARCH_de.md) | [Español](docs/RAG_SEARCH_es.md) | [Português](docs/RAG_SEARCH_pt.md) | [Italiano](docs/RAG_SEARCH_it.md))

### AI Discussion

The **Discussion** tab provides a multi-model debate arena where multiple AI models discuss a topic in parallel, draw conclusions, and vote on the best answer.

![AI Discussion](docs/images/ai-discussion.png)

**How it works:**

1. Open the **Discussion** tab
2. Enter a discussion theme
3. Add participants — choose any available model (API, CLI, Local LLM) or User
4. Optionally assign roles to participants (e.g., "Affirmative", "Critical")
5. Set the number of turns
6. Click **Start Discussion**

![Discussion Setup](docs/images/ai-discussion-start.png)

**Discussion flow:**

1. **Discussion turns** — All participants respond in parallel. Each turn builds on previous responses.
2. **Conclusion** — In the final turn, each participant provides their conclusion.
3. **Voting** — Vote participants evaluate all conclusions and vote for the best one.
4. **Result** — The winner (or draw) is announced. Save the full transcript as a Markdown note.

![Voting Results](docs/images/ai-discussion-voting.png)

**Features:**

- **Any model as participant** — Mix models freely (e.g., Gemini vs Claude vs GPT)
- **User participation** — Add yourself as a participant or voter for human-in-the-loop discussions
- **Role assignment** — Give each participant a perspective (e.g., "Optimist", "Skeptic")
- **Separate vote participants** — Vote participants are auto-synced from discussion participants but can be customized independently
- **Persistent configuration** — Participants and voters are saved and restored across sessions
- **Settings modal** — Click the gear icon (⚙️) to configure system prompt, conclusion prompt, vote prompt, output folder, and default turns
- **Save as note** — Export the complete discussion (turns, conclusions, votes, winner) as a Markdown file

### Slash Commands
- Define custom prompt templates triggered by `/`
- Optional model and search override per command

![Slash Commands](docs/images/setting_slash_command.png)

## Requirements

- Obsidian v0.15.0+
- At least one of: API key (Gemini, OpenAI, Anthropic, OpenRouter, Grok), local LLM server, or CLI tool
- Desktop only (for mobile, see [Gemini Helper](https://github.com/takeshy/obsidian-gemini-helper))

## Privacy

**Data stored locally:**
- API keys (stored in Obsidian settings)
- Chat history (as Markdown files, optionally encrypted)
- Workflow execution history (optionally encrypted)
- RAG vector index (stored in workspace folder)
- Encryption keys (private key encrypted with your password)

**Data sent to LLM providers:**
- Chat messages and file attachments are sent to the configured API provider (Gemini, OpenAI, Anthropic, OpenRouter, Grok, or custom endpoint)
- When Web Search is enabled (Gemini only), queries are sent to Google Search
- Local LLM providers send data only to your local server

**Data sent to third-party services:**
- Workflow `http` nodes can send data to any URL specified in the workflow

**CLI providers (optional):**
- When CLI mode is enabled, external CLI tools (gemini, claude, codex) are executed via child_process
- This only occurs when explicitly configured and verified by the user
- CLI mode executes external CLI tools via child_process

**Discord bot (optional):**
- When enabled, the plugin connects to Discord via WebSocket Gateway and sends user messages to the configured LLM provider
- Bot token is stored in Obsidian settings
- Message content from Discord channels is processed by the LLM — configure allowed channels/users to restrict access

**MCP servers (optional):**
- MCP (Model Context Protocol) servers can be configured in plugin settings for workflow `mcp` nodes
- MCP servers are external services that provide additional tools and capabilities

**Security notes:**
- Review workflows before running - `http` nodes can transmit vault data to external endpoints
- Workflow `note` nodes show a confirmation dialog before writing files (default behavior)
- Slash commands with `confirmEdits: false` will auto-apply file edits without showing Apply/Discard buttons
- Sensitive credentials: Do not store API keys or tokens directly in workflow YAML (`http` headers, `mcp` settings, etc.). Instead, store them in encrypted files and use `note-read` node to retrieve them at runtime. Workflows can read encrypted files with password prompt.

See each provider's terms of service for data retention policies.

## License

MIT

## Links

- [Gemini API Docs](https://ai.google.dev/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Ollama](https://ollama.com)
- [Obsidian Plugin Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## Support

If you find this plugin useful, consider buying me a coffee!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/takeshy)
