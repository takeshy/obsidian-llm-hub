---
type: Product Reference
title: Models and Installation
description: Model availability per provider, installation options, requirements, and provider notes.
tags: [models, installation, requirements]
timestamp: 2026-07-05T00:00:00Z
---

# Models and Installation

LLM Hub requires Obsidian v1.10.0 or later and runs as a desktop-only plugin. Configure at least one provider, such as Gemini, OpenAI, Anthropic, OpenRouter, Grok, OpenCode Zen/Go, a local OpenAI-compatible endpoint, or a supported CLI provider (Antigravity, Claude, or Codex CLI).

Free Gemini API keys support basic chat, vault operations, Gemini web search, and workflows. Paid provider keys and local/CLI backends unlock the models and capabilities offered by those providers.

# Model Availability

There is no fixed model list. After entering an API key, Verify fetches the provider's available models, and the user checks which models to enable; enabled models appear in the chat model dropdown. Multiple providers can be configured simultaneously.

Local LLM models are auto-detected from the running server during Verify. CLI providers use their own authenticated accounts and appear as single model entries after verification.

# Embeddings for RAG

RAG needs an embedding endpoint, configured per RAG setting:

- Gemini-native embeddings - leave the embedding base URL empty to use the Gemini provider key.
- OpenAI-compatible or Ollama endpoints - for example a local Ollama server with an embedding model such as `nomic-embed-text`.

Chat and embeddings are independent: a cloud chat provider can be combined with local embeddings.

# Thinking Mode

Chat can enable thinking based on message keywords such as "think", "analyze", or "consider". Gemini 3.1 Pro always uses thinking mode. Flash model families can also be forced to always think from the tool menu; Flash is off by default and Flash Lite is on by default.

# Installation

Recommended installation is through BRAT: install the BRAT plugin, choose "Add Beta plugin", and enter `https://github.com/takeshy/obsidian-llm-hub`, then enable the plugin in Community plugins settings.

Manual installation copies `main.js`, `manifest.json`, and `styles.css` from releases into `.obsidian/plugins/llm-hub/`.

Source installation:

```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

# Provider Notes

Gemini-specific features include Gemini web search, Deep Research, and Gemini image generation. Local LLM and CLI providers are desktop workflows and require their corresponding local servers or command-line tools to be installed and reachable from Obsidian.
