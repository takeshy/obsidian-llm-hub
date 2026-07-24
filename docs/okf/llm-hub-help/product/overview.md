---
type: Product
title: LLM Hub for Obsidian
description: Free Obsidian plugin that adds multi-provider AI chat, vault tools, workflows, RAG, OKF knowledge, MCP, skills, encryption, and edit history.
tags: [llm-hub, obsidian, overview]
timestamp: 2026-07-05T00:00:00Z
---

# LLM Hub for Obsidian

LLM Hub is a free and open-source desktop Obsidian plugin for using multiple AI providers from inside a vault. It supports Gemini, OpenAI, Anthropic, OpenRouter, Grok, the OpenCode Zen/Go gateways, OpenAI-compatible local LLM endpoints (Ollama, LM Studio, vLLM, AnythingLLM, OpenCode local), and CLI providers (Antigravity CLI, Claude Code, Codex CLI), depending on the user's settings and installed tools.

Main feature areas:

- AI Chat with streaming responses, file attachments, slash commands, mentions, vault tools, MCP tools, and independent Web Search plus optional RAG that can be used together.
- Agent Skills with built-in Obsidian Markdown, Canvas, and Bases skills, Dashboard Hub's dynamically contributed Dashboard skill, plus vault-authored and external skills.
- Workflow Builder for multi-step automations defined in Markdown `workflow` code blocks and edited visually.
- RAG using local embedding vector search for semantic retrieval across vault content.
- OKF Knowledge Sources that inject compact Open Knowledge Format bundle summaries into chat context.
- MCP support for Streamable HTTP and stdio MCP servers, workflow MCP nodes, and sandboxed MCP Apps.
- Optional Dashboard Hub integration that supplies configured AI models, Chat handoff, Base generation, text rewriting, and Workflow generation/execution to that separate plugin.
- Edit history, safe edit confirmations, AI folder access limits, and optional encryption.

Provider API keys and local/CLI configuration determine which models and capabilities are available. Native web search is available through Gemini and official OpenAI, Anthropic, or xAI API endpoints and can synthesize provider search results with locally retrieved RAG context; Deep Research and Gemini image generation remain Gemini-specific.

# Citations

[1] Project README in the obsidian-llm-hub repository.
