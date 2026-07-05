---
type: Feature
title: AI Chat
description: Chat provides multi-provider LLM conversations with streaming, attachments, mentions, slash commands, vault operations, MCP tools, web search, RAG, image generation, and safe editing.
tags: [chat, tools, editing]
timestamp: 2026-07-05T00:00:00Z
---

# AI Chat

Open chat from the ribbon, the command "LLM Hub: Open chat", or "LLM Hub: Toggle chat / editor". Enter sends a message, Shift+Enter inserts a newline, the stop button aborts generation, the plus button starts a new chat, and the history button loads previous chats.

Chat works with multiple backends: the Gemini API, OpenAI-compatible APIs (OpenAI, OpenRouter, Grok), the Anthropic API, CLI providers (Gemini CLI, Claude CLI, Codex CLI), and local LLM servers (Ollama, LM Studio, vLLM). Local servers using LM Studio, AnythingLLM, or vLLM endpoints support function-calling vault tools; the native Ollama API mode does not, so point Ollama at its OpenAI-compatible endpoint via the LM Studio framework to use tools.

Slash commands are reusable prompt templates. They can insert `{selection}` and `{content}`, override the model, the search setting, the vault tool mode, the enabled MCP servers, and whether edits require confirmation, and are triggered by typing `/`. The default `/infographic` command turns selected or active-note content into an HTML infographic.

Mentions are inserted by typing `@`. `{selection}` expands to the captured editor selection when sent, `{content}` expands to the active note content when sent, and file mentions insert vault paths that the AI can read through tools.

Attachments can include images, PDFs, text files, audio, and video. Files are converted to Base64 and sent in each provider's multimodal format where the model supports it.

Image generation models are supported in chat: selecting an image model (or asking for an image, which can auto-switch to one) generates images in the response.

Vault tools let the AI read, create, search, rename, edit, and delete notes and folders. Editing, renaming, and deletion use proposal tools by default: the user must approve changes before they are applied. Tool mode controls are:

- Vault: all - all vault tools.
- Vault: no search - disables `search_notes` and `list_notes`; other tools, including `list_folders`, stay available.
- Vault: off - no vault tools.

Chat can also use web search, selected RAG stores, MCP servers, a sandboxed `execute_javascript` tool, active skills (via `run_skill_workflow` and `run_skill_script`), and active OKF knowledge.

Chat history is stored as Markdown files under the configured workspace folder when history saving is enabled. History files can optionally be encrypted with the chat history encryption setting.

# Related

- [RAG Semantic Search](./rag.md) explains semantic retrieval.
- [OKF Knowledge Sources](./okf.md) explains curated prompt context.
- [MCP](./mcp.md) explains external tools.
- [Security and Privacy](../operations/security-privacy.md) explains confirmations and folder limits.
