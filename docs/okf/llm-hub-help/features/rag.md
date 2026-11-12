---
type: Feature
title: RAG Semantic Search
description: RAG builds a local vector index of vault files (embeddings + cosine similarity) and injects retrieved chunks into the system prompt for all chat providers.
tags: [rag, semantic-search, embeddings, local-index]
timestamp: 2026-07-05T00:00:00Z
---

# RAG Semantic Search

RAG is LLM Hub's semantic search feature. It chunks selected vault files, generates embeddings, and stores them in a local vector index. Before the main chat response, the user message is embedded and matched against the index by cosine similarity; the top-scoring chunks are appended to the system prompt and reported back to the UI as RAG sources.

Because retrieval happens locally before the LLM call, RAG works with every chat provider — API providers, CLI backends, and local LLM servers — and can be combined with function calling (vault tools). With a supported API model, Chat can also keep Web Search enabled alongside one RAG setting so the response synthesizes current web information with retrieved vault context. Non-text results (images, PDF pages, audio, video) are additionally attached to the LLM call as files so the model can see the actual content.

Use RAG when the user wants broad retrieval over notes, HTML, plain text, PDFs, images, or audio/video. Use vault tools when the target file is known or exact file operations are needed. Use OKF for curated concepts and stable domain knowledge.

# Embedding Providers

Each RAG setting has its own embedding configuration:

- Empty embedding URL: Gemini native embedding via the SDK. Default model is `gemini-embedding-2-preview`.
- Custom embedding URL: any OpenAI-compatible `/v1/embeddings` endpoint (Ollama, LM Studio, vLLM, etc.), with its own API key and model.

The model picker fetches available models from Ollama's `/api/tags` when present, otherwise from the OpenAI-compatible `/v1/models` endpoint.

# Index Modes

Internal mode is the default: LLM Hub manages a local index for the setting, stored in the vault at `{workspaceFolder}/rag/{settingName}/` as `index.json` (chunk metadata and checksums) plus `vectors.bin` (embedding vectors).

External mode uses `externalIndexPath`: one or more newline-separated absolute paths to pre-built local index directories (each containing `index.json` and `vectors.bin`). LLM Hub searches them read-only and does not sync vault files into them. Multiple external indexes with the same embedding dimension are merged.

Combined mode uses `sourceRagSettings`: a setting can merge the indexes of other internal RAG settings into one searchable index.

# Eligible Files

- Markdown (`md`), HTML (`html`, `htm`), and plain text (`txt`) are indexed independently of the Index multimodal setting. Extensions are case-insensitive. HTML is converted to Markdown with Obsidian's HTML conversion before chunking and embedding; plain text is read as-is. These text formats work with both Gemini native and OpenAI-compatible embedding providers.
- PDF (`pdf`) is indexed when Index multimodal is enabled. With Gemini native embedding, PDF pages are embedded directly in chunks of 1-6 pages (PDF chunk pages setting); with other providers, PDF text is extracted and embedded as text chunks.
- Images (`png`, `jpg`, `jpeg`) and audio/video (`mp3`, `wav`, `mp4`, `mpeg`) are indexed only when Index multimodal is enabled and Gemini native embedding is used.

# Sync Behavior

Sync is checksum-based and incremental:

- `targetFolders` limits sync to selected vault folders; empty means the whole vault.
- `excludePatterns` are regex patterns; invalid regexes are skipped.
- Markdown checksums come from file content; binary checksums from modification time and size.
- Changed or new files are embedded; unchanged files are skipped.
- Files removed from the vault or excluded by filters are removed from the local index.
- Sync progress reports embed, skip, and remove actions, and can be cancelled.
- At most 50 changed files are embedded per sync run; the rest are deferred, so large vaults need repeated sync runs to finish indexing.

The last full sync time is stored as `lastFullSync`. Changing the embedding model, chunk size, chunk overlap, PDF chunk pages, or the Index multimodal setting triggers a full index rebuild on the next sync.

# Retrieval Settings

Each RAG setting controls retrieval:

- `topK` - maximum number of chunks returned.
- `scoreThreshold` - minimum cosine similarity score (0.0-1.0).
- `searchFileExtensions` - restrict results to given file extensions; empty means all.
- `chunkSize` / `chunkOverlap` - chunking parameters used at index time.
- `jevRagFilterEnabled` - existing Jev ON/OFF toggle. ON uses Score reranking; new indexes default off.
- `jevRerankCandidateK` - internal scoring batch size; default 40, at least Top K. No extra UI control.

# Jev Reranking

Configure a direct TypeSafe key or select the existing OpenRouter key in Settings → Jev.
Keep using the per-index Jev ON/OFF toggle and the existing search-until-found checkbox.
There is no filter/rerank selector, minimum-score field, or candidate-count input.
Existing enabled filter flags and the transitional `filter` mode migrate to enabled
Score reranking. Explicit off stays off. The old global toggle is used only when
migrating settings without a per-index choice.

With search-until-found off, score one candidate batch, sort by descending relevance
with retrieval order breaking ties, and return Top K even when scores are below 2.
With **Search until an answer is found** on, score consecutive batches until at least
one result scores **2 or higher**. Return only results at or above 2 from that first
qualifying batch, sorted by score and limited to Top K. Stop even if fewer than Top K
qualify. If all retrieved candidates are exhausted below 2, return no results.
The internal batch size is max(topK, jevRerankCandidateK), defaulting to at least 40.
The initial candidate retrieval happens once, without re-embedding for later batches.

The ordered relevance rubric is 0 unrelated, 1 keyword overlap only, 2 partially
useful, and 3 directly answers the query. Jev's `score` can be fractional; confidence
measures distribution concentration and is not used for relevance ordering. The
Search tab shows the Jev score out of 3 alongside the original retrieval score.

Text candidates share one request with the query included once in `state`. Native
PDF chunks use extracted page text; scanned PDF chunks and native images are scored
individually with bounded JPEG assets. If content cannot be resolved, the original
retrieval order is retained rather than scoring a filename label. Audio/video chunks
also fall back to the original order.

Reranking depends on a cloud service and sends the query and candidate contents to
the configured TypeSafe or OpenRouter endpoint. More candidates increase processing
time and cost. OpenRouter Decisions (`/api/alpha/decisions`) is alpha. Each scoring batch
has a 20-second deadline, including media preparation and rate-limit retries. HTTP 429 observes `Retry-After` within that deadline. A timeout, incomplete
score response, or other failure stops further batches and returns the original
retrieval first Top K candidates. Unscored candidates are never treated as below 2.

An in-memory cache holds up to 1,000 scores for 10 minutes. Keys hash the query,
actual chunk contents (including resolved PDF text/images), path, chunk/page,
endpoint/model, rubric version, and account. No scores are persisted to disk.

Official contracts: [TypeSafe System One](https://docs.typesafe.ai/api/system-one.md)
and [OpenRouter Jev](https://openrouter.ai/~typesafe/jev-latest).

# Operations

- Clear index deletes the setting's local index directory (`index.json` and `vectors.bin`).
- Deleting a RAG setting removes only the setting; its index data stays on disk.
- Reset sync state clears `lastFullSync` for the setting.

# Related

- [RAG Search Tab](./rag-search.md) explains manual search, filtering, chunk editing, and handoff to Chat or Discussion.
- [OKF Knowledge Sources](./okf.md) explains curated Markdown knowledge bundles.
- [Settings](../operations/settings.md) lists all RAG settings.
- [Vault Tools](./vault-tools.md) explains exact vault operations.
