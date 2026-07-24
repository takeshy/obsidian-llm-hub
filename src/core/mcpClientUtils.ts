// Shared utilities for MCP client implementations

import type { McpAppResult, McpAppUiResource, McpServerConfig } from "../types";
import type { McpToolCallResult, McpResourceReadResult, IMcpClient } from "./mcpClient";

/**
 * Map McpToolCallResult to McpAppResult (shared between HTTP and stdio transports)
 */
export function mapToolCallToAppResult(result: McpToolCallResult): McpAppResult {
  return {
    content: result.content?.map(c => ({
      type: c.type,
      text: c.text,
      data: c.data,
      mimeType: c.mimeType,
      resource: c.resource,
    })) || [],
    isError: result.isError,
    _meta: result._meta,
  };
}

/**
 * Map McpResourceReadResult to McpAppUiResource (shared between HTTP and stdio transports)
 */
export function mapResourceReadResult(result: McpResourceReadResult): McpAppUiResource | null {
  if (result.contents && result.contents.length > 0) {
    const content = result.contents[0];
    return {
      uri: content.uri,
      mimeType: content.mimeType || "text/html",
      text: content.text,
      blob: content.blob,
    };
  }
  return null;
}

/**
 * Create an MCP client from either a full server config or URL/headers fallback.
 * Used by McpAppRenderer and McpAppModal for backward-compatible client creation.
 */
export function createClientFromAppInfo(
  serverConfig?: McpServerConfig,
  serverUrl?: string,
  serverHeaders?: Record<string, string>,
): IMcpClient {
  // Lazy import to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Resolve the circular client dependency only when an MCP app is created.
  const { createMcpClient, McpHttpClient } = require("./mcpClient") as typeof import("./mcpClient");
  if (serverConfig) {
    return createMcpClient(serverConfig);
  }
  return new McpHttpClient({
    name: "mcp-app",
    transport: "http",
    url: serverUrl || "",
    headers: serverHeaders,
    enabled: true,
  });
}
