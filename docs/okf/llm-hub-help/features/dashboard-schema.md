---
type: Feature Reference
title: Dashboard Schema
description: Storage model and schema guidance for `.dashboard` files, widget configs, and generated sidecar files.
tags: [dashboard, schema, widgets]
timestamp: 2026-07-05T00:00:00Z
---

# Dashboard Schema

A dashboard is a `.dashboard` file parsed as YAML with version `1`. It is opened by `DashboardView`, a `TextFileView` registered for the `.dashboard` extension.

The dashboard stores widget definitions and responsive layout. Widget content is not always embedded in the `.dashboard` file; some widgets reference vault files or sidecar data.

# Standard Locations

- New dashboards are created under `Dashboards/`.
- AI-created backing `.base` files are stored under `Dashboards/Bases/`.
- Workflow widget cache files are stored under `Dashboards/Data/<encoded dashboard path>.json`.
- Reading memos are stored under `Dashboards/Memos/`.
- Timeline posts are stored under `Dashboards/Timeline/<name>/`.
- Timeline image attachments are stored under `Dashboards/Timeline/<name>/attachments/<date>/`.
- Reusable Kanban definitions are stored under `Dashboards/Kanbans/` as `.kanban` YAML files.

# Layout and Alignment

The dashboard grid uses 12 columns, row height `80`, and gap `8` by default. Widget layout is stored per breakpoint:

- `lg` - large-screen layout.
- `sm` - small-screen layout, derived from `lg` when missing.

Widgets can be dragged and resized directly. The layout engine prevents overlap by pushing colliding widgets downward. File widgets disable drag/resize handles while their memo panel is open (desktop only; on mobile the handles stay enabled).

The toolbar provides:

- Undo - revert dashboard changes in the current editing session.
- Redo - reapply reverted dashboard changes.
- Align horizontally - distribute widgets into up to three vertical columns. If there are more than three widgets, later widgets stack within those columns.
- Align vertically - distribute widgets into up to three horizontal rows. If a row has multiple widgets, they share the row width.

Alignment updates only the `lg` layout and removes explicit `sm` layout so mobile layout can be re-derived. It uses the visible dashboard area height to estimate target rows and keeps each tile at least two grid rows high.

# Widget Configurations

Base widgets reference a `.base` path and optional view name. They can create or edit `.base` files and show table, cards, list, or map views through Obsidian's native Bases UI.

File widgets reference a vault file path and optional header setting, plus persisted memo panel state (`memoPanelOpen`, `memoPanelCollapsed`). They render Markdown, text, HTML, images, PDFs, EPUBs, or a fallback open button.

Web widgets store a URL and optional header setting. Some sites cannot be embedded because of frame-blocking headers.

Workflow widgets store workflow path, output format (`Markdown` or `HTML`), output variable name, and refresh interval. They render from cache and should not rely on interactive workflow nodes.

Kanban definitions store tag and folder filters, status property, title property, columns, displayed frontmatter fields, unmatched-column behavior, and an optional linked Timeline name (`timelineName`). Per-widget manual card order stays in the `.dashboard` file. When `timelineName` is non-empty, card moves append status-change posts to that Timeline.

Timeline widgets store a timeline name, latest post count, and collapse line/character limits (`name`, `latestCount`, `collapseLineLimit`, `collapseCharLimit`). Feed filters are transient UI state and are not stored. Posts are `---`-separated blocks inside per-day Markdown files.

Calendar widgets store a Timeline name and whether created files are shown (`timelineName`, `showCreatedFiles`). Calendar events are Timeline post blocks containing `<!-- calendar-event: YYYY-MM-DD -->`; changing an event date moves its block between per-day files.

MemoList widgets index dashboard memo files and open selected memos inside the widget.

Unknown widget types are preserved on round-trip and render as a placeholder, so dashboards created by newer or extended versions do not lose widget data when saved.

# AI Authoring Guidance

When users ask chat to build a dashboard, the built-in dashboard skill should create the `.dashboard` file plus any needed `.base` files. Prefer Base widgets for structured note lists and Workflow widgets for generated reports.

# Related

- [Dashboard Widgets](./dashboard-widgets.md) explains per-widget behavior and settings.
