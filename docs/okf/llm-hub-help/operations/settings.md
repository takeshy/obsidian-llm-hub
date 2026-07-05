---
type: Operations
title: Settings and Operations
description: Operational reference for provider configuration, workspace storage, knowledge sources, build commands, version bumping, and plugin reloads.
tags: [settings, build, operations]
timestamp: 2026-07-05T00:00:00Z
---

# Settings and Operations

Important settings areas:

- CLI provider settings verify Antigravity, Claude, and Codex CLI backends.
- Local LLM settings configure one or more local OpenAI-compatible servers.
- API provider settings manage multiple API providers, each with its own key and models.
- Proxy settings route API traffic through an HTTP CONNECT proxy; see [Proxy Settings](./proxy.md).
- Workspace settings control workspace folder, hidden workspace behavior, chat history, system prompt, and AI folder access.
- RAG settings manage local embedding indexes, sync, retrieval limits, folders, and exclusions.
- Knowledge sources configure an external OKF directory.
- External skills install versioned skills from the official repository.
- MCP servers configure Streamable HTTP and stdio MCP servers.
- Encryption settings configure keys and encrypted chat or workflow history.
- Langfuse settings configure optional observability.
- Slash command settings configure reusable chat commands.
- Discord settings configure an optional Discord bot integration.
- Edit history is always enabled internally; there is no visible settings UI for it.

Chat histories are saved as Markdown files under `{workspaceFolder}/{chatId}.md` when saving is enabled. RAG workspace state is stored in `gemini-workspace.json` inside the workspace folder (the legacy dotted `.gemini-workspace.json` is migrated automatically).

# CLI Provider Settings

Each CLI backend has a row with Verify, disable, and settings actions:

- Antigravity CLI - install Google Antigravity CLI (`agy`) and authenticate.
- Claude CLI - install with `npm install -g @anthropic-ai/claude-code` and authenticate.
- Codex CLI - install with `npm install -g @openai/codex` and authenticate.
- Custom executable path - each CLI can point to a custom binary or script path from its settings modal.

Verify must succeed before a CLI appears as a chat model. CLI models do not use vault tools.

# Local LLM Settings

One or more local server configurations can be added. Each configuration includes:

- Framework - Ollama, LM Studio, AnythingLLM, vLLM, or OpenCode local server.
- Base URL - for example `http://localhost:11434` (Ollama) or `http://localhost:1234` (LM Studio).
- Optional API key, and Basic Auth username/password for the OpenCode local server.
- Optional temperature and max response tokens.
- Verify - fetches the server's model list; selected models appear in the chat model dropdown.

Ollama uses its native `/api/chat` endpoint and does not support vault tools. LM Studio, vLLM, and AnythingLLM support OpenAI-style function calling; models that reject tools are auto-downgraded to marker mode until re-enabled from settings.

# API Provider Settings

The API Providers section manages multiple providers that can be configured simultaneously. Each provider entry configures:

- Provider type - Gemini, OpenAI, Anthropic, OpenRouter, Grok, OpenCode Zen, OpenCode Go, or a custom OpenAI-compatible endpoint.
- Name and base URL - known providers get default base URLs.
- API key - stored in Obsidian settings.
- Verify - required before saving; fetches the provider's available models.
- Enabled models - checked models appear in the chat model dropdown.

Providers can be enabled, disabled, edited, and deleted from the list.

# Workspace Settings

- Workspace folder - vault-relative folder for LLM Hub data. Defaults to `LLMHub`. Absolute paths and `..` traversal are rejected. If the old folder exists, the user can move existing data or skip moving.
- Hide workspace folder - available only when the workspace folder is the default `LLMHub`; hides or shows that folder in Obsidian.
- Save chat history - toggles chat history file persistence. Turning it off asks whether to delete existing chat history files.
- System prompt - additional user-defined instructions appended to the chat system prompt.
- Folders AI can access automatically - comma-separated vault-relative allowlist for automatic AI vault tool access. Empty means whole-vault access. Invalid traversal paths are rejected.

# Tool Limit Settings

These are under the Workspace tool limits details section:

- Max tool calls - maximum function calls per chat response. Default 20, range 1-50.
- Tool call warning threshold - remaining call count where the UI can warn or offer extension. Default 5, capped by Max tool calls.
- List notes limit - default result limit for `list_notes`. Default 50, range 10-200.
- Max note characters - maximum characters read from a note. Default 20000, range 1000-100000.

# Slash Command Settings

The Slash Commands section manages reusable `/command` prompts. Each command can configure:

- Command name - slash command identifier; normalized to lowercase letters, numbers, `_`, and `-`.
- Description - optional autocomplete/help text.
- Prompt template - required prompt body; can use placeholders such as `{selection}` and `{content}`.
- Model - optional fixed model, or use the current model.
- Search setting - current setting, none, web search when available, or a configured RAG setting.
- Confirm edits - whether edits triggered by the command require confirmation.
- Vault tool mode - current setting, all tools, no search tools, or no vault tools.
- MCP servers - current setting or an explicit subset of configured MCP servers.

# External Skills Settings

- Official repository - fixed to `takeshy/llm-hub-skills`.
- Install a skill - select a compatible catalog entry and install it.
- Installed skills - show installed version, available update status, and per-skill update check/install action.

# Knowledge Source Settings

- OKF enabled - turns the external OKF knowledge source on or off.
- OKF source path - vault-relative path such as `Knowledge` or `.Knowledge`, or an absolute desktop path. The built-in LLM Hub OKF bundle is available independently of this setting.

# RAG Settings

RAG uses a local embedding vector index stored in the workspace folder.

- RAG setting - select, create, rename, or delete named RAG settings.

Each selected RAG setting can configure:

- RAG mode - internal (index built from the vault), combined (merges other internal settings with the same embedding configuration), or external (points at a pre-built index directory).
- Embedding base URL - OpenAI-compatible or Ollama embedding endpoint; empty uses Gemini-native embeddings.
- Embedding API key - empty falls back to the Gemini provider API key.
- Embedding model - empty uses the Gemini default embedding model.
- Chunk size - default 500 characters; chunk overlap - default 100.
- PDF chunk pages - pages per PDF chunk. Default 6.
- Retrieved chunks limit - top-K chunks to retrieve. Default 5, range 1-20.
- Score threshold - minimum similarity score for retrieved chunks. Default 0.3.
- Target folders - comma-separated vault folders to include in sync; empty means all eligible vault files.
- Excluded patterns - newline-separated regex patterns for files to exclude.
- Sync Vault - embeds vault files into the local index, with progress and a cancel button.
- Clear index - deletes the local index data after confirmation.
- External index path - absolute path to a pre-built index directory (external mode); the embedding model is detected from the index.

# Encryption Settings

Before setup:

- Encryption password - password used to encrypt the private key.
- Confirm password - confirmation field.
- Setup encryption - generates keys and enables encryption for chat and workflow history by default.

After setup:

- Encryption configured status - indicates key material exists.
- Encrypt AI chat history - encrypts newly saved chat history.
- Encrypt workflow execution logs - encrypts newly saved workflow history.
- Reset encryption keys - clears encryption settings after confirmation. Existing encrypted files require the old password/key material to decrypt.

# Langfuse Settings

Shown only when Langfuse tracing support is available:

- Public key - enables the detailed Langfuse settings section.
- Secret key - password-style field with show/hide button.
- Base URL - defaults to `https://cloud.langfuse.com`.
- Log prompts - whether to send prompts to Langfuse.
- Log responses - whether to send responses to Langfuse.
- Test connection - sends a test trace.

# MCP Server Settings

The MCP Servers section can add, edit, and delete MCP servers. Each server configures a transport:

- Streamable HTTP - server URL plus optional headers as a JSON object for authentication or custom headers.
- Stdio (desktop only) - local process command, arguments, environment variables, and framing (`content-length` by default, or `newline`).
- Test connection - required before saving a new or untested server; retrieves tool names as tool hints.

Saved server rows show tool hints and include edit/delete actions. Updating MCP servers clears the cached MCP tool list.

# Discord Settings

The Discord section configures an optional bot integration:

- Enable - turns the Discord bot on or off.
- Bot token and connection status.
- Respond to DMs - whether the bot answers direct messages.
- Require mention - whether channel messages must @mention the bot.
- Allowed channels / allowed users - comma-separated IDs; empty means all.
- Model - empty uses the currently selected chat model.
- System prompt - optional override for Discord conversations.
- Max response length - characters per Discord message.

# Workflow-Related Settings Outside The Settings Tab

Workflow hotkeys and event triggers are stored in plugin settings but configured from the Workflow / skill panel:

- Workflow hotkeys - enabled per workflow, then assigned in Obsidian's Hotkeys settings.
- Workflow event triggers - enabled per workflow with event types and optional file pattern filters.

Development commands:

```bash
npm run build
npm run dev
npm run lint
```

After building, reload the plugin in Obsidian to test changes.

Version bumps should use npm's version command so `package.json`, `manifest.json`, and `versions.json` stay aligned:

```bash
npm version patch
npm version minor
npm version major
```

# Related

- [Proxy Settings](./proxy.md) explains proxy configuration.
- [RAG Semantic Search](../features/rag.md) explains RAG settings.
- [OKF Knowledge Sources](../features/okf.md) explains OKF settings.
- [Agent Skills](../features/agent-skills.md) explains skill installation.
