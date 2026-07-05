---
type: Feature Reference
title: RAG Search Tab
description: The RAG Search tab provides controllable semantic search, keyword filtering, chunk editing, AI refinement, and result handoff to Chat or Discussion.
tags: [rag, search, semantic-search, keyword-filter, discussion]
timestamp: 2026-07-05T00:00:00Z
---

# RAG Search Tab

The RAG Search tab is the manual counterpart to the Chat RAG dropdown. It lets users choose a RAG setting, run semantic search, adjust Top K and score threshold, filter returned chunks by keywords, edit context before sending, and hand selected results to Chat or Discussion.

# Search and Filtering

Results are ranked by cosine similarity between the query embedding and indexed chunks. After retrieval, users can filter the result list with one or more keyword fields:

- Terms inside one field use OR logic.
- Quoted phrases (e.g. `"release notes"`) are matched as a single term.
- Multiple fields use AND logic.
- Filtering checks both chunk text and file path.
- Whitespace is normalized so PDF extraction line breaks and full-width spaces do not prevent matches.
- A space-stripped version of text is also checked, which helps CJK text split by PDF extraction artifacts.
- Select-all and visible counts follow the filtered view.

Each keyword field can use AI keyword suggestion. The sparkle button asks the configured AI Refine Model to expand terms with synonyms, related words, and English translations for non-English input. The undo button restores the previous field value.

# Selecting and Sending Results

Users select result rows with checkboxes, then send selected items to:

- Chat - results become input attachments, and the Chat RAG dropdown is cleared to avoid duplicate context injection.
- Discussion - results become Discussion attachments and the UI switches to the Discussion panel.

Text results are editable text attachments. Media results such as images, PDFs, audio, and video are attached as binary files. In Chat, text attachments with source paths can be clicked to review and edit the content in a modal before sending.

# Chunk Editing

Expanded text results expose a chunk editor. The editor can:

- Edit chunk text directly.
- Load the previous chunk from the same file and remove overlap.
- Load the next chunk from the same file and remove overlap.
- Combine adjacent chunks into one editable block.

Use chunk editing when semantic search finds a relevant passage but misses surrounding context.

# Refine with AI

Refine with AI expands and cleans a chunk using the AI Refine Model:

1. It loads up to three previous and three next chunks in parallel.
2. The model evaluates whether more surrounding context is needed and can request more chunks in either direction for up to five iterations.
3. The model removes chunking artifacts, broken sentences, and noise while preserving meaningful information.

The refined text streams into the editor. The operation is one-time per edit session, hides previous/next chunk buttons while active, disables the textarea during processing, and preserves the original language.

# PDF Results

PDF results support two attachment modes:

- As text - text is extracted with PDF.js and becomes searchable, filterable, previewable, and editable.
- As PDF chunk - original PDF pages are attached as binary with inline preview.

Text extraction runs in the background for PDF results, including vault PDFs and external absolute-path PDFs. Once extracted, keyword filtering and chunk editing operate on real PDF text rather than only metadata.

# Index Settings in Search

The search file extensions filter sits in the search parameter row next to Top K and score threshold, not in the gear section.

The Search tab gear exposes per-RAG-setting controls. For all settings:

- AI Refine Model.
- Last-sync timestamp.
- Indexed files list with per-file chunk counts.

For internal (plugin-managed) RAG settings only:

- Chunk size.
- Chunk overlap.
- PDF chunk pages, from 1 to 6 pages per embedding chunk.
- Target folders.
- Exclude regex patterns.
- Sync button with progress bar.

# Chat RAG vs Search Handoff

Chat RAG dropdown is automatic context injection: the plugin retrieves context and injects it into the system prompt. It is convenient but not editable before sending.

Search -> Chat or Search -> Discussion is explicit context handoff: the user controls Top K, threshold, keyword filtering, result selection, adjacent chunk loading, and AI refinement. Results become user-visible attachments.

# RAG in Discussion

Discussion can receive RAG context in two ways:

- Search -> Discussion attaches selected Search results.
- Discussion RAG dropdown uses the discussion theme as the search query.

RAG context and attachments are sent only in the first discussion turn. Later turns use the accumulated discussion history and do not repeat the same retrieval.

# Related

- [RAG Semantic Search](./rag.md) explains store modes, sync, metadata, and chat retrieval.
- [Settings](../operations/settings.md) lists RAG configuration settings.
- [Chat](./chat.md) explains Chat attachments and RAG dropdown behavior.
