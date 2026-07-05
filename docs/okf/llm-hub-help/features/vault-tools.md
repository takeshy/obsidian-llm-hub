---
type: Feature Reference
title: Vault Tools
description: Function-calling tools available to chat for reading, searching, creating, editing, deleting, renaming, and inspecting vault files.
tags: [chat, vault-tools, editing]
timestamp: 2026-07-05T00:00:00Z
---

# Vault Tools

Vault tools are function-calling tools used by chat to operate on the Obsidian vault. They work with all providers that support function calling (Gemini, OpenAI-compatible, Anthropic, CLI, and compatible local servers). Users control them from the Database icon tool menu.

# Tool Modes

- Vault: all - full vault access through available tools.
- Vault: no search - disables `search_notes` and `list_notes` while keeping direct read/write tools and `list_folders`.
- Vault: off - disables vault tools.

# Chat Tools

- `read_note` - read note content.
- `create_note` - create a new note.
- `propose_edit` - propose a safe edit with Apply/Discard confirmation.
- `propose_delete` - propose file deletion with confirmation.
- `bulk_propose_edit` - propose edits to multiple files with selection UI.
- `bulk_propose_delete` - propose deletion of multiple files with selection UI.
- `search_notes` - search by name or content.
- `list_notes` - list notes in a folder.
- `rename_note` - propose renaming or moving a note with Apply/Discard confirmation.
- `bulk_propose_rename` - propose renames for multiple files.
- `create_folder` - create a vault folder.
- `list_folders` - list vault folders.
- `get_active_note_info` - inspect the active note.

Beyond vault tools, chat also provides `execute_javascript` (runs code in a sandboxed iframe with no DOM, network, or storage access) and, when skills are active, `run_skill_workflow` and `run_skill_script` for running skill-provided workflows and scripts.

# Safe Editing

Chat uses proposal tools for edits, renames, and deletes by default. A file is not changed until the user confirms: `propose_edit` keeps the proposed content in memory without writing to the file, Apply writes it, and Discard clears the pending proposal, leaving the file untouched.

# Folder Access

Settings -> Workspace -> LLM vault tool folders can restrict LLM vault tools and LLM-triggered skill workflows to specified vault-relative folders. Empty means whole-vault access. This does not restrict RAG, manual attachments, explicit mentions, MCP tools, scripts, shell commands, or direct workflow note nodes.
