---
type: Feature Reference
title: External Skill Import
description: External skills are installed from the official repository using SKILL.md plus manifest.json compatibility and version rules.
tags: [skills, import, manifest]
timestamp: 2026-07-04T00:00:00Z
---

# External Skill Import

LLM Hub imports external skills from the fixed official repository `takeshy/llm-hub-skills`. The repository is fixed because skills can run workflows and external actions; restricting imports to a trusted source is the main safety boundary.

Imported skills are copied into the vault `skills/` folder and then appear in the chat skill selector. Built-in skills are not modified by import.

# Repository Layout

The official repository uses `skills/<skill-id>/` folders. Each skill must contain:

- `manifest.json` for versioning and compatibility checks.
- `SKILL.md` for instructions.
- Optional `references/` files.
- Optional `workflows/` files.

Example:

```text
skills/
  code-review/
    manifest.json
    SKILL.md
    references/
      style-guide.md
    workflows/
      review.md
```

# Manifest Rules

The manifest `id` must match the folder name when present. `version` is required and must be valid semver. `compatibility.plugins` can include plugin IDs such as `llm-hub` with optional `minVersion` and `maxVersion`.

Example:

```json
{
  "id": "code-review",
  "name": "Code Review",
  "version": "1.2.0",
  "description": "Review code changes and suggest concrete fixes.",
  "compatibility": {
    "plugins": [
      { "id": "llm-hub", "minVersion": "1.16.0" }
    ]
  }
}
```

Invalid, missing, incompatible, or unversioned manifests are skipped. Missing `SKILL.md` is also skipped.

Optional manifest fields:

- `description` - short human-readable summary.
- `hostPatches` - host-specific unified diff files to apply during install.

`hostPatches` maps plugin IDs to patch paths relative to the skill folder:

```json
{
  "hostPatches": {
    "llm-hub": ["patches/llm-hub.patch"]
  }
}
```

Patch files can target `SKILL.md`, `a/SKILL.md`, `b/SKILL.md`, or `skills/<id>/SKILL.md`. Patches cannot write outside the skill folder.

# Install and Update Behavior

If the skill is not installed, it is copied into the vault. If it is already installed, the source is installed only when the source semver is higher than the installed semver. Existing files with the same path are overwritten. Files removed from the source repository are not deleted from the vault.

If a clean re-import is needed, delete the target skill folder from the vault first, then install again.

The settings UI installs one selected skill at a time. The same validation rules still apply to every selected skill.

# Pull Request Workflow

External skill updates are distributed by pull request to the official repository. After merge, users install or update from LLM Hub settings. The repository is public and no authentication token is required.

# User Flow

Open Settings -> External skills, select a compatible skill, install it, then enable it from chat. Imported skills use the same selector, slash commands, references, and workflow execution as vault-authored skills.
