---
type: Product Reference
title: Models and Installation
description: Supported API plans, model availability, installation options, requirements, related plugins, and support links.
tags: [models, installation, requirements]
timestamp: 2026-07-04T00:00:00Z
---

# Models and Installation

LLM Hub requires Obsidian v0.15.0 or later and runs as a desktop-only plugin. Configure at least one provider, such as Gemini, OpenAI, Anthropic, OpenRouter, Grok, a local OpenAI-compatible endpoint, or a supported CLI provider.

Free Gemini API keys support basic chat, vault operations, Gemini web search, limited Gemini File Search RAG sync, and workflows. Paid provider keys and local/CLI backends unlock the models and capabilities offered by those providers.

# Paid Plan Models

- Gemini 3.1 Pro Preview - flagship model with 1M context; recommended for highest quality.
- Gemini 3.1 Pro Preview (Custom Tools) - optimized for agentic workflows with custom tools and bash.
- Gemini 3.5 Flash - fast 1M-context model with strong cost performance.
- Gemini 3.1 Flash Lite - stable, low-latency, cost-effective 1M-context model.
- Gemini 2.5 Flash - fast 1M-context model.
- Gemini 2.5 Pro - Pro 1M-context model.
- Gemini 3 Pro (Image) - Pro image generation, up to 4K.
- Gemini 3.1 Flash (Image) - fast, low-cost image generation.

# Free Plan Models

- Gemini 2.5 Flash.
- Gemini 2.5 Flash Lite.
- Gemini 3.5 Flash.
- Gemini 3.1 Flash Lite.
- Gemma 4 31B.
- Gemma 4 26B A4B MoE.

# Thinking Mode

Chat can enable thinking based on message keywords such as "think", "analyze", or "consider". Gemini 3.1 Pro always uses thinking mode. Flash model families can also be forced to always think from the tool menu; Flash is off by default and Flash Lite is on by default.

# Installation

Recommended installation is through Obsidian Community plugins: Settings -> Community plugins -> Browse -> search "LLM Hub" -> install and enable.

BRAT can install beta versions from `https://github.com/takeshy/obsidian-llm-hub`.

Manual installation copies `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/llm-hub/`.

Source installation:

```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

# Provider Notes

Gemini-specific features include Gemini web search, Gemini File Search RAG, Deep Research, and Gemini image generation. Local LLM and CLI providers are desktop workflows and require their corresponding local servers or command-line tools to be installed and reachable from Obsidian.
