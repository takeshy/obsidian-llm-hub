---
type: Playbook
title: Security and Privacy
description: LLM Hub protects users with confirmation flows, optional encryption, folder access limits, scoped tools, and sandboxed MCP Apps.
tags: [security, privacy, encryption]
timestamp: 2026-07-05T00:00:00Z
---

# Security and Privacy

LLM Hub sends chat requests, attachments, tool results, and optional feature payloads to the provider or local/CLI backend selected by the user. Web search sends queries to the active Tavily or Brave Search provider and returns results to the selected chat model as function-call context. Search keys follow the credential storage preference, and configured proxies also apply to search traffic. Deep Research and Gemini image generation use Google's APIs. Search source links and function-call results may be saved with chat history. RAG embedding sync sends vault file chunks to the configured embedding endpoint; the resulting vectors are stored locally.

Safe editing is the default for chat tools. `propose_edit`, `bulk_propose_edit`, `propose_delete`, `bulk_propose_delete`, and `bulk_propose_rename` show confirmation UI before modifying files. The legacy direct `update_note` tool is disabled in favor of proposal-based editing.

AI Folder Access is configured in Settings -> Workspace -> Folders AI can access automatically. Empty means automatic vault tools may access the whole vault. Non-empty values restrict automatic chat and AI command workflow vault operations to listed vault-relative folders. This restriction does not limit RAG retrieval, manual attachments, explicit mentions, MCP tools, scripts, or direct workflow note nodes.

Encryption can password-protect chat history and workflow execution logs. Encrypted files are read by workflows after prompting for the password when needed; the password is cached only for the Obsidian session.

Edit history tracks AI and manual file changes while Obsidian is running. It is stored in memory and cleared on restart; Obsidian's built-in file recovery covers persistent recovery.

MCP Apps run in sandboxed iframes and cannot directly access the parent Obsidian UI or local storage.

# Live Voice Sessions

Live sends microphone audio to the official Gemini or OpenAI API chosen inside the Live dialog, independently of the normal chat model. Any registered official Gemini/OpenAI key can be selected; text-chat enabled/verification flags do not gate Live. Stop before switching provider/model; prior transcripts remain in the dialog. The saved key creates short-lived credentials locally: a single-use Gemini WebSocket token or OpenAI WebRTC client secret. Session setup follows HTTP proxy settings; realtime media is direct. No KiokuFlow server is used.

Users choose whether to include the current chat, enable read-only Vault access, and independently search an optional RAG index, even when direct Vault access is off. Vault reads, including unsaved editor text, honor the allowed-folder list. RAG results come from the selected index and are not filtered by that separate Vault tool folder list. Live has no write/delete, skill, script, MCP, or external Web search tools. Text transcripts follow the existing chat history and encryption settings; the plugin does not persist raw audio.

# Related

- [Chat](../features/chat.md) explains safe editing.
- [MCP](../features/mcp.md) explains MCP App sandboxing.
