---
type: Feature
title: MCP Support
description: MCP servers add external tools to chat and workflows via Streamable HTTP or stdio transports, and MCP Apps render sandboxed interactive UI resources inside Obsidian.
tags: [mcp, tools, integrations]
timestamp: 2026-07-05T00:00:00Z
---

# MCP Support

MCP servers are configured in Settings -> MCP Servers with a name, a transport, and an enabled flag. The HTTP transport takes a Streamable HTTP URL and optional JSON headers. The stdio transport (desktop only) launches a local server process with a command, arguments, optional environment variables, and a framing protocol (content-length or newline). The Test connection action verifies the server and stores tool hints for display.

In chat, users enable MCP servers from the tool settings opened by the Database icon. In workflows, the `mcp` node calls configured MCP server tools.

Tool calls require approval unless the server's **Always approve** setting is enabled or the exact tool name is in its allowed list. The approval dialog shows the server, tool, and arguments, and offers **Allow once**, **Always allow this tool**, and **Deny**. Closing the dialog denies the call. Remove an allowed tool in the server settings and save to require approval again. Servers not saved in settings can only be approved for one call.

Workflow `mcp` and `command` nodes support `confirm: "false"` to skip MCP approval for that node, including automatic execution. The node editor exposes this as **Confirm MCP tool calls**. Otherwise, server approval settings apply. Interactive calls made later inside MCP Apps follow server approval settings.

The MCP client speaks JSON-RPC over both transports; the HTTP client implements Streamable HTTP and manages `Mcp-Session-Id` sessions. Tool results can include text, images, or resources.

MCP Apps are interactive UI resources returned by MCP tools. When a tool result includes a `ui://` resource URI, LLM Hub fetches the resource and renders it in a sandboxed iframe. Chat shows MCP Apps inline in assistant messages with expand and collapse controls. Workflows show MCP Apps in a modal and continue after the modal closes.

Security behavior: MCP App iframes are sandboxed with `allow-scripts` and `allow-forms`; they cannot access the parent DOM, cookies, or local storage. Apps communicate with MCP tools through a restricted JSON-RPC bridge.

# Related

- [Chat](./chat.md) explains MCP in chat.
- [Workflows](./workflows.md) explains the `mcp` workflow node.
