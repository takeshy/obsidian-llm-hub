---
type: Feature
title: Agent Skills
description: Skills add reusable instructions, references, and optional workflows and scripts to chat, with built-in Obsidian skills and installable external skills.
tags: [skills, workflow, chat]
timestamp: 2026-07-05T00:00:00Z
---

# Agent Skills

Agent Skills extend chat with reusable instructions, reference files, executable workflows, and executable scripts. A vault skill lives under `skills/<skill-id>/` and must have `SKILL.md`; it can also include `references/`, `workflows/`, and `scripts/`.

Built-in skills are available without vault setup. They teach the AI about Obsidian-specific formats:

- `obsidian-markdown` covers Obsidian Markdown extensions such as wikilinks, embeds, callouts, properties, tags, highlights, comments, math, and footnotes. It is auto-activated by default in new chats.
- `json-canvas` covers `.canvas` JSON Canvas files.
- `base` covers `.base` files and includes the Bases authoring reference.
- When the separate Dashboard Hub plugin is enabled, it contributes a `dashboard` skill at runtime for authoring `.dashboard` files and backing `.base` files.

External skills are installed from the official `takeshy/llm-hub-skills` repository into the vault `skills/` folder. Each external skill must include `SKILL.md` and `manifest.json`; versions are compared with semver for updates.

Users activate skills from the chat skill selector or by slash command using the skill folder name, for example `/weekly-report`. Built-in skills are fully inlined into the system prompt. Vault skills are lazy-loaded: chat initially sees only name, description, and `SKILL.md` path, then reads `SKILL.md` with `read_note` before invoking workflows or scripts. In CLI and local-LLM mode, where vault tools are unavailable, the model instead emits the `[READ_SKILL: skillName]` marker to load `SKILL.md`. If a skill exposes workflows, chat gets a `run_skill_workflow` tool; if it exposes scripts, chat gets a `run_skill_script` tool (desktop only). Workflow results return all variables whose names do not start with `__` (double underscore); single-underscore variables are returned.

Skills can be created with AI from the Workflow / skill tab. The AI generates both the `SKILL.md` instructions and workflow YAML. Existing skills can be modified with AI from an active `SKILL.md`.

# Related

- [Workflows](./workflows.md) explains executable workflow capabilities.
- [Skill Authoring](./skill-authoring.md) explains SKILL.md, references, workflows, and scripts.
- [Skill Chat and Workflows](./skill-chat-workflows.md) explains activation and workflow execution.
- [OKF Knowledge Sources](./okf.md) explains when to use OKF instead of skills.
