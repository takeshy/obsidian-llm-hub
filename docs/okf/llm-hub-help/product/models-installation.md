---
type: Product Reference
title: Models and Installation
description: Model availability per provider, installation options, requirements, and provider notes.
tags: [models, installation, requirements]
timestamp: 2026-07-05T00:00:00Z
---

# Models and Installation

LLM Hub requires Obsidian v1.10.0 or later and runs as a desktop-only plugin. Configure at least one provider, such as Gemini, OpenAI, Anthropic, OpenRouter, Grok, OpenCode Zen/Go, a local OpenAI-compatible endpoint, or a supported CLI provider (Antigravity, Claude, or Codex CLI).

Free Gemini API keys support basic chat, vault operations, Gemini web search, and workflows. Official OpenAI, Anthropic, and xAI APIs also expose their native web-search tools when supported by the selected model. Paid provider keys and local/CLI backends unlock the models and capabilities offered by those providers.

# Model Availability

There is no fixed model list. After entering an API key, Verify fetches the provider's available models, and the user checks which models to enable; enabled models appear in the chat model dropdown. Multiple providers can be configured simultaneously.

Native web search also avoids a fixed chat-model allowlist. It is enabled by provider capability, and unsupported models surface the provider's error. Development smoke tests covered OpenAI GPT-5.6 Sol and Anthropic Claude Opus 4.8, Sonnet 5, Fable 5, and Haiku 4.5; automated Responses-stream tests cover Grok 4.5. OpenAI image-generation models, Grok image/video-generation models, and non-official compatible gateways are excluded from native web search.

Local LLM models are auto-detected from the running server during Verify. CLI providers use their own authenticated accounts and appear as single model entries after verification.

# Embeddings for RAG

RAG needs an embedding endpoint, configured per RAG setting:

- Gemini-native embeddings - leave the embedding base URL empty to use the Gemini provider key.
- OpenAI-compatible or Ollama endpoints - for example a local Ollama server with an embedding model such as `nomic-embed-text`.

Chat and embeddings are independent: a cloud chat provider can be combined with local embeddings.

# Thinking Mode

Chat shows a reasoning-effort selector beside the model picker for supported OpenAI and Gemini API models. `default` uses provider-default behavior, while `none` is offered where the model can disable reasoning. Gemini models that cannot fully disable thinking expose their lowest supported effort. Prompt keywords do not alter the selected effort.

# Installation

Install LLM Hub from Obsidian's Community Plugins browser: open **Settings → Community plugins**, select **Browse**, search for **LLM Hub**, then select **Install** and **Enable**.

Manual installation copies `main.js`, `manifest.json`, and `styles.css` from releases into `.obsidian/plugins/llm-hub/`.

Source installation:

```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

# Provider Notes

Gemini-specific features include Deep Research and Gemini image generation. Native web search is available through Gemini and official OpenAI, Anthropic, or xAI API endpoints. Local LLM and CLI providers are desktop workflows and require their corresponding local servers or command-line tools to be installed and reachable from Obsidian.
