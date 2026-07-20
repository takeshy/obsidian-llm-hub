---
type: Feature
title: AI Chat
description: Chat provides multi-provider LLM conversations with streaming, attachments, mentions, slash commands, vault operations, MCP tools, web search, RAG, image generation, and safe editing.
tags: [chat, tools, editing]
timestamp: 2026-07-05T00:00:00Z
---

# AI Chat

Open chat from the ribbon, the command "LLM Hub: Open chat", or "LLM Hub: Toggle chat / editor". Enter sends a message, Shift+Enter inserts a newline, the stop button aborts generation, the plus button starts a new chat, and the history button loads previous chats.

The input remembers up to 100 sent user prompts in workspace state, so recall works across chats and Obsidian restarts. Up recalls an older prompt when the caret is on the first line, and Down advances when the caret is on the last line. This preserves normal Up/Down cursor movement within multiline text. Moving past the newest recalled prompt restores the unsent draft.

Chat works with multiple backends: the Gemini API, OpenAI-compatible APIs (OpenAI, OpenRouter, Grok), the Anthropic API, CLI providers (Gemini CLI, Claude CLI, Codex CLI), and local LLM servers (Ollama, LM Studio, vLLM). Local servers using LM Studio, AnythingLLM, or vLLM endpoints support function-calling vault tools; the native Ollama API mode does not, so point Ollama at its OpenAI-compatible endpoint via the LM Studio framework to use tools.

Slash commands are reusable prompt templates. They can insert `{selection}` and `{content}`, override the model, the search setting, the vault tool mode, the enabled MCP servers, and whether edits require confirmation, and are triggered by typing `/`. The default `/infographic` command turns selected or active-note content into an HTML infographic.

Mentions are inserted by typing `@`. `{selection}` expands to the captured editor selection when sent, `{content}` expands to the active note content when sent, and file mentions insert vault paths that the AI can read through tools.

Attachments can include images, PDFs, text files, audio, and video. Files are converted to Base64 and sent in each provider's multimodal format where the model supports it.

Image generation models are supported in chat: selecting an image model (or asking for an image, which can auto-switch to one) generates images in the response.

Vault tools let the AI read, create, search, rename, edit, and delete notes and folders. Editing, renaming, and deletion use proposal tools by default: the user must approve changes before they are applied. Tool mode controls are:

- Vault: all - all vault tools.
- Vault: no search - disables `search_notes` and `list_notes`; other tools, including `list_folders`, stay available.
- Vault: off - no vault tools.

# Conversation Context Limit

The Database icon tool menu also contains **Previous messages (0-99)**. It controls how many messages before the current prompt are sent to the model. A value of 0 disables prior conversation injection and sends only the current prompt; this is useful when processing unrelated PDFs or notes one at a time. The selected value is saved in workspace state and applies across supported chat providers.

# Web Search

Web search is available with Gemini and with OpenAI, Anthropic, or Grok providers configured to use their official API hosts. Open the search menu beside the model picker and check **Web search** before sending the prompt. The same menu can select one Semantic Search (RAG) setting, and both may be active together. RAG context is retrieved and injected before the provider receives the prompt with its native web-search tool enabled, allowing one response to synthesize vault and web information. Asking the model to browse does not enable search by itself; the model still decides whether to call the enabled web tool.

Web and RAG preferences are saved per workspace. An unsupported capability remains remembered but inactive across model switches and automatically returns when a compatible model is selected. Combined RAG settings remain the way to search several underlying indexes from Chat.

OpenAI and Grok search use their providers' Responses APIs, while Anthropic search uses its native server tool. All can coexist with vault and MCP tools. Custom gateways, OpenRouter, local LLMs, CLI providers, OpenAI image-generation models, and Grok image/video-generation models do not expose this option. There is no fixed chat-model allowlist: unsupported models return their provider's error. Development smoke tests covered GPT-5.6 Sol and Claude Opus 4.8, Sonnet 5, Fable 5, and Haiku 4.5; automated Responses-stream tests cover Grok 4.5.

Only cited sources are shown. OpenAI and Anthropic citation positions are rendered as numbered Markdown links; xAI's native inline Markdown citations are preserved. Sources are deduplicated into clickable pills beneath the **Used web search** badge. Chat history stores cited-source metadata and opaque provider continuation items for later turns. Native continuation is replayed only while the endpoint and model match and the associated user/assistant pair remains inside the configured previous-message limit; otherwise visible assistant text is used. xAI's exact billed cost is used when present, including token and server-tool charges.

Chat can also use selected RAG stores, MCP servers, a sandboxed `execute_javascript` tool, active skills (via `run_skill_workflow` and `run_skill_script`), and active OKF knowledge.

Chat history is stored as Markdown files under the configured workspace folder when history saving is enabled. History files can optionally be encrypted with the chat history encryption setting. The saved chat remains complete even when the conversation context limit sends only a subset of its messages to the model.

# Related

- [RAG Semantic Search](./rag.md) explains semantic retrieval.
- [OKF Knowledge Sources](./okf.md) explains curated prompt context.
- [MCP](./mcp.md) explains external tools.
- [Security and Privacy](../operations/security-privacy.md) explains confirmations and folder limits.
