---
type: Operations
title: Privacy and Data Flow
description: Explains what data remains local, what is sent to configured AI providers, and what can be sent to third-party services.
tags: [privacy, data-flow, providers]
timestamp: 2026-07-04T00:00:00Z
---

# Privacy and Data Flow

Data stored locally includes provider credentials in Obsidian settings, chat history Markdown files when saving is enabled, workflow execution history, workspace RAG state, dashboard YAML files, dashboard sidecar data, and encryption settings. Chat and workflow history can be encrypted.

Data sent to configured AI providers can include chat messages, selected context, tool results included in the model conversation, and file attachments. Provider-specific features send data to that provider's services; for example, Gemini File Search RAG uploads selected vault files to Google File Search, and Gemini web search sends search queries to Google Search.

Data sent to third parties can include payloads sent by workflow `http` nodes, data sent to configured MCP servers, data handled by local or CLI provider processes, and content loaded by web embeds or MCP Apps. Users should review workflows, provider configuration, and MCP server configuration before running them with sensitive data.

Encrypted files cannot be read by normal AI vault chat tools. Workflows can read encrypted files through `note-read` after a password prompt, which caches the password for the current Obsidian session.

Sensitive credentials should not be stored directly in workflow YAML, HTTP headers, or MCP settings. Store secrets in encrypted files and read them at runtime.
