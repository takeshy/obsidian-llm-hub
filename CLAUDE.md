# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian plugin for multi-provider LLM Chat, Workflow Automation, and Semantic Search (RAG). Supports Gemini, OpenAI, Anthropic, OpenRouter, Grok via API, plus CLI backends (Gemini CLI, Claude CLI, Codex CLI) and local LLM servers (Ollama, LM Studio, vLLM).

## Build Commands

```bash
npm run build    # Production build (tsc + esbuild) -> outputs main.js
npm run dev      # Development build with watch mode
npm run lint     # ESLint check
```

After building, reload the plugin in Obsidian to test changes.

## Version Bumping

Use npm's built-in version command which automatically updates all version files:

```bash
npm version patch   # 1.2.3 -> 1.2.4
npm version minor   # 1.2.3 -> 1.3.0
npm version major   # 1.2.3 -> 2.0.0
```

This runs `version-bump.mjs` which updates `package.json`, `manifest.json`, and `versions.json` together.

## Architecture

### Core Layer (`src/core/`)
- **gemini.ts** - Gemini API client wrapper
  - `GeminiClient` class with streaming chat, function calling, and RAG integration
  - `chatWithToolsStream()` - Main method for chat with tools and optional RAG
  - `messagesToContents()` - Converts Message[] to Gemini Content[] format (private)
- **localRagStore.ts** - Local RAG store with cosine-similarity search
  - `LocalRagStore` - Manages in-memory index/vectors, sync, and search
  - `searchLocalRag()` - Entry point for RAG context injection
  - Supports external pre-built index via `externalIndexPath`
- **localRagStorage.ts** - Persistence for local RAG index (index.json + vectors.bin)
- **embeddingProvider.ts** - Embedding generation via OpenAI-compatible API
  - `generateEmbeddings()` - Batch embedding generation
  - `fetchEmbeddingModels()` - Fetches available models (Ollama /api/tags or /v1/models)
- **openaiProvider.ts** - OpenAI-compatible API provider (chat, image generation)
- **anthropicProvider.ts** - Anthropic API provider (chat with tools)
- **tools.ts** - Function calling tool definitions (15 tools for vault operations)
- **cliProvider.ts** - CLI backend abstraction for Gemini/Claude/Codex CLIs
  - `CliProviderManager` - Manages CLI provider instances
  - Prefers `child_process.spawn` with `shell: false` everywhere. On Windows, auto-detects the npm-global `.js` script (via `findWindowsNpmScript`) and runs it through `node`, or the standalone `claude.exe`. Only falls back to `shell: true` + command name when no `.js`/`.exe` is found, so `.cmd` wrappers from PATH still work (with the documented cmd.exe-metacharacter caveat for user prompts).
  - `findNodeBinary()` - Resolves node path from version managers (nodenv, nvm, volta, fnm, asdf, mise)
  - Custom CLI paths dispatch by extension on Windows (`.js` → node, `.exe` → direct, `.cmd`/`.bat` → shell). On macOS/Linux always run via `node <path>`.
- **mcpClient.ts** - MCP (Model Context Protocol) client for external tool servers
  - Implements Streamable HTTP transport with JSON-RPC

### Vault Layer (`src/vault/`)
- **notes.ts** - Note CRUD operations + safe editing with `proposeEdit()`/`applyEdit()`/`discardEdit()`
- **search.ts** - Local vault search (filename and content)
- **toolExecutor.ts** - Maps tool calls to vault operations

### Workflow Layer (`src/workflow/`)
- **types.ts** - Workflow node types and execution context definitions
- **parser.ts** - Parses workflow YAML from markdown code blocks
- **executor.ts** - Stack-based workflow execution engine with MAX_ITERATIONS (1000) safety
- **nodeHandlers.ts** - Re-exports handlers from `handlers/` modules
- **handlers/** - Individual handler modules (controlFlow, command, http, note, prompt, file, integration, script)
- **history.ts** - Execution history tracking
- **historyCanvas.ts** - Export execution history to Obsidian Canvas
- **codeblockSync.ts** - Sync workflow changes back to markdown

### UI Layer (`src/ui/`)
- **ChatView.tsx** - Obsidian ItemView wrapper for React
- **SettingsTab.tsx** - Plugin settings UI
- **components/** - React components (Chat, MessageList, MessageBubble, InputArea)
- **components/workflow/** - Workflow-specific modals and WorkflowPanel.tsx

### Key Data Flow (Chat)
1. User sends message → `Chat.tsx` → `GeminiClient.chatWithToolsStream()`
2. Gemini responds with text/function calls → streamed back to UI
3. Function calls → `toolExecutor.ts` → `notes.ts`/`search.ts` → results back to Gemini
4. RAG: If enabled, local embedding search injects relevant context into system prompt

### Key Data Flow (Workflow)
1. User selects workflow → `WorkflowPanel.tsx` loads from markdown code block
2. `parseWorkflowFromMarkdown()` converts YAML to `Workflow` graph
3. `WorkflowExecutor.execute()` traverses nodes using stack-based execution
4. Each node type handled by specific handler in `handlers/` modules
5. Results saved to execution history, optionally exported to Canvas

## Important Implementation Details

### Safe Editing (`propose_edit` tool)
- Changes applied directly to file, original content backed up in memory
- User clicks Apply (confirm) or Discard (restore from backup)
- `update_note` tool disabled to force safe editing flow

### RAG Integration
- Multiple RAG settings stored in workspace state file (`.gemini-workspace.json`)
- Each RAG setting has its own embedding config (URL, API key, model, chunk size, overlap, topK)
- Local vector index stored in `{workspaceFolder}/rag/{settingName}/` (index.json + vectors.bin)
- Supports external pre-built index via `externalIndexPath` (absolute path to directory)
- RAG injects context into system prompt before LLM call (works with all providers, non-exclusive with vault tools)

### Chat History
- Saved as Markdown files in `{workspaceFolder}/chats/{chatId}.md`
- YAML frontmatter with title, timestamps
- Messages parsed/serialized via `messagesToMarkdown()`/`parseMarkdownToMessages()`

### Streaming
- Uses SDK Chat (`this.ai.chats.create()`) for automatic thought signature handling
- AbortController for stop functionality

### Workflow Execution
- Stack-based traversal with iteration counting for loop safety
- Conditional nodes (`if`, `while`) use labeled edges ("true"/"false")
- Variables interpolated via `{{varName}}` syntax in node properties
- Sub-workflows executed recursively with variable passing
- Event triggers support glob patterns for file filtering

### MCP Integration
- External MCP servers configured via settings (`mcpServers` array)
- `McpClient` implements Streamable HTTP transport
- Session management with `Mcp-Session-Id` header
- Available in workflow `mcp` nodes

## Key Types (`src/types/index.ts`)

- `Message` - Chat message with optional attachments, toolsUsed, pendingEdit, ragUsed
- `PendingEditInfo` - Tracks edit status (pending/applied/discarded)
- `StreamChunk` - Streaming response types (text, tool_call, tool_result, rag_used, error, done)
- `LlmHubSettings` - Plugin configuration
- `WorkspaceState` - Per-workspace state (selected model, RAG settings)
- `RagSetting` - Individual RAG store configuration

### Workflow Types (`src/workflow/types.ts`)

- `WorkflowNodeType` - 25 node types (command, http, note, dialog, mcp, script, etc.)
- `WORKFLOW_NODE_TYPES` - Set of all valid node type strings (single source of truth)
- `isWorkflowNodeType()` - Type guard used by parser.ts and codeblockSync.ts
- `normalizeValue()` - Converts unknown YAML values to string (shared utility)
- `Workflow` - Node graph with edges and start node
- `ExecutionContext` - Variables map and execution logs
- `PromptCallbacks` - UI callbacks for interactive nodes

## Adding New Workflow Node Types

When adding a new workflow node type, **ALL** of the following files must be updated:

1. **`src/workflow/types.ts`** - Add to `WorkflowNodeType` union type AND `WORKFLOW_NODE_TYPES` set (single source of truth for `isWorkflowNodeType()`)
2. **`src/workflow/workflowSpec.ts`** - Add documentation for AI workflow generation
3. **`src/workflow/handlers/`** - Add `handle*Node()` function in appropriate module and re-export from `nodeHandlers.ts`
4. **`src/workflow/executor.ts`** - Add `case` in the switch statement to call handler and log
5. **`src/ui/components/workflow/WorkflowPanel.tsx`**:
   - Add to `NODE_TYPE_LABELS` object
   - Add to `ADDABLE_NODE_TYPES` array
   - Add to `getDefaultProperties()` switch
   - Add to `getNodeSummary()` switch
6. **`src/ui/components/workflow/NodeEditorModal.ts`**:
   - Add to `NODE_TYPE_LABELS` object
   - Add `case` in `renderPropertyFields()` switch for editor UI

**Common mistakes**:
- Forgetting `WORKFLOW_NODE_TYPES` set causes nodes to be skipped during parsing and disappear from visual workflow
- Forgetting `executor.ts` causes node execution to fail silently

## Notes

- Obsidian API accessed via `app.vault` (files) and `app.workspace` (UI)
- React components rendered inside Obsidian's ItemView
- File attachments converted to Base64 and sent as `inlineData` parts
- CLI providers dynamically import `child_process`
- Desktop only
