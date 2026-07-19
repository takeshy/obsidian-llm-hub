---
type: Playbook
title: Troubleshooting User Questions
description: Common practical answers for users who are unsure how LLM Hub features work or why something is unavailable.
tags: [troubleshooting, support]
timestamp: 2026-07-05T00:00:00Z
---

# Troubleshooting User Questions

If image generation is unavailable, check that an image-capable model is selected on a provider that supports it, such as Gemini image models or DALL-E via OpenAI.

If a model says it cannot browse or only has vault tools, check the search dropdown beside the model picker. It must show **Web search**, not **Search: none**; asking for current information in the prompt does not enable the tool automatically. Web search is offered for Gemini and for official OpenAI (`api.openai.com`), Anthropic (`api.anthropic.com`), or Grok (`api.x.ai`) API providers. It is not offered for compatible/custom gateways, local or CLI providers, OpenAI image-generation models, or Grok image/video-generation models. When enabled successfully, a response that actually searches shows the **Used web search** badge and cited-source links. Provider errors are shown directly when a selected model does not support its provider's native search tool.

If the AI cannot find vault content, check vault tool mode, AI Folder Access restrictions, RAG selection, and whether the file was explicitly attached or mentioned. Vault: Off disables vault tools. Vault: No search disables search and list tools.

If RAG misses content, check whether the target folder is included, the file type is supported, exclude patterns do not match the file, and sync has run after the latest edits. Also confirm the RAG setting's embedding endpoint is reachable and the embedding model exists; embedding API rate limits can slow or fail sync. If a PDF is synced but never retrieved, text extraction may have produced no content (for example image-only scanned PDFs).

If a local LLM model is unavailable, check that the local server is running and the Base URL is reachable, then run Verify again. If the model list cannot be fetched, check the framework selection and endpoint: Ollama lists models via `/api/tags`, OpenAI-compatible servers via `/v1/models`.

If vault tools fail with a local model, the model may not support function calling; such models are auto-downgraded to marker mode (re-enable tools from the Local LLM settings). Use workflows with note nodes as an alternative.

If OKF knowledge is not appearing, check Settings -> Knowledge sources, confirm OKF is enabled, confirm the path is vault-relative or an accessible absolute desktop path, and confirm the bundle has `index.md` files and concept files with `type` frontmatter. Built-in LLM Hub OKF is always available for plugin help.

If a skill does not appear, check that it is under the vault `skills/` folder and contains `SKILL.md`. External skills also need `manifest.json`.

If a skill workflow fails, use the Open workflow button shown on the failed tool call. It opens the workflow file and switches to the Workflow / skill tab. Use Modify workflow with AI and reference execution history for the failing step.

If a workflow does not parse or disappears from the visual editor, check that its node types are valid and that each workflow file contains one `workflow` code block.

If edits are not applied, check for a pending confirmation dialog. Proposal tools do not write changes until the user clicks Apply.
