import { requireMcpApproval } from "./mcpApproval";
// MCP (Model Context Protocol) client for Streamable HTTP transport
// Reference: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http

import { requestUrl } from "obsidian";
import type { McpServerConfig, McpToolInfo, McpAppResult, McpAppUiResource } from "../types";
import { mapToolCallToAppResult, mapResourceReadResult } from "./mcpClientUtils";

const MODERN_PROTOCOL_VERSION = "2026-07-28";
const LEGACY_PROTOCOL_VERSION = "2025-11-25";
export const MCP_APPS_CLIENT_CAPABILITIES = {
  extensions: {
    "io.modelcontextprotocol/ui": {
      mimeTypes: ["text/html;profile=mcp-app"],
    },
  },
};
const SUPPORTED_LEGACY_PROTOCOL_VERSIONS = new Set([
  LEGACY_PROTOCOL_VERSION,
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
]);

type McpProtocolEra = "modern" | "legacy";

// JSON-RPC types (shared across transports)
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

// MCP Protocol types (shared across transports)
export interface McpInitializeResult {
  protocolVersion: string;
  capabilities: {
    tools?: Record<string, unknown>;
    extensions?: Record<string, unknown>;
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

interface McpDiscoverResult {
  supportedVersions: string[];
  capabilities: McpInitializeResult["capabilities"];
  _meta?: {
    "io.modelcontextprotocol/serverInfo"?: McpInitializeResult["serverInfo"];
  };
}

export interface McpToolsListResult {
  tools: McpToolInfo[];
  ttlMs?: number;
  cacheScope?: "private" | "public";
}

export interface McpToolCallResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
    resource?: {
      uri: string;
      mimeType?: string;
      text?: string;
    };
  }>;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
  _meta?: {
    ui?: {
      resourceUri: string;
    };
    "ui/resourceUri"?: string;
  };
}

// MCP resource read result
export interface McpResourceReadResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;  // Base64 encoded binary
    _meta?: McpAppUiResource["_meta"];
  }>;
}

/**
 * Common interface for MCP clients (HTTP and stdio transports)
 */
export interface IMcpClient {
  initialize(): Promise<McpInitializeResult>;
  listTools(): Promise<McpToolInfo[]>;
  getToolsCacheTtlMs(): number | null;
  callToolRaw(toolName: string, args?: Record<string, unknown>, skipApproval?: boolean): Promise<McpToolCallResult>;
  callToolWithUi(toolName: string, args?: Record<string, unknown>, skipApproval?: boolean): Promise<McpAppResult>;
  readResource(uri: string): Promise<McpAppUiResource | null>;
  close(): Promise<void>;
}

/**
 * MCP Client for communicating with external MCP servers via Streamable HTTP transport
 */
export class McpHttpClient implements IMcpClient {
  private config: McpServerConfig;
  private sessionId: string | null = null;
  private requestId = 0;
  private initialized = false;
  private cachedInitResult: McpInitializeResult | null = null;
  private protocolEra: McpProtocolEra | null = null;
  private negotiatedProtocolVersion: string | null = null;
  private toolsCacheTtlMs: number | null = null;

  constructor(config: McpServerConfig) {
    this.config = config;
  }

  /**
   * Send a JSON-RPC request to the MCP server
   */
  private async sendRequest(method: string, params?: Record<string, unknown>, allowSessionRetry = true): Promise<unknown> {
    const modern = this.protocolEra === "modern" || method === "server/discover";
    const requestParams = modern ? this.withModernMetadata(params) : params;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: ++this.requestId,
      method,
      params: requestParams,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      ...this.config.headers,
    };

    if (modern) {
      headers["MCP-Protocol-Version"] = MODERN_PROTOCOL_VERSION;
      headers["Mcp-Method"] = method;
      const name = this.getRequestName(method, requestParams);
      if (name) headers["Mcp-Name"] = name;
    } else if (this.negotiatedProtocolVersion && method !== "initialize") {
      headers["MCP-Protocol-Version"] = this.negotiatedProtocolVersion;
    }

    // Add session ID if we have one
    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }

    try {
      const response = await requestUrl({
        url: this.config.url,
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      // Extract session ID from response header if present
      const newSessionId = response.headers["mcp-session-id"];
      if (newSessionId) {
        this.sessionId = newSessionId;
      }

      // Check content type for SSE vs JSON
      const contentType = response.headers["content-type"] || "";

      if (contentType.includes("text/event-stream")) {
        // Handle SSE response - parse event stream
        return this.parseSSEResponse(response.text, request.id, modern);
      } else {
        // Regular JSON response
        const jsonResponse = response.json as JsonRpcResponse;

        if (jsonResponse.error) {
          throw new Error(`MCP Error ${jsonResponse.error.code}: ${jsonResponse.error.message}`);
        }

        return this.unwrapResult(jsonResponse.result, modern);
      }
    } catch (error) {
      const status = this.getErrorStatus(error);
      if (allowSessionRetry && this.protocolEra === "legacy" && this.sessionId && status === 404 && method !== "initialize") {
        this.sessionId = null;
        this.initialized = false;
        await this.initializeLegacy();
        return this.sendRequest(method, params, false);
      }
      if (error instanceof Error) {
        const wrapped = new Error(`MCP request failed: ${error.message}`) as Error & { status?: number };
        wrapped.status = status;
        throw wrapped;
      }
      throw error;
    }
  }

  private withModernMetadata(params?: Record<string, unknown>): Record<string, unknown> {
    const values = params || {};
    const existingMeta = values._meta && typeof values._meta === "object"
      ? values._meta as Record<string, unknown>
      : {};
    return {
      ...values,
      _meta: {
        ...existingMeta,
        "io.modelcontextprotocol/protocolVersion": MODERN_PROTOCOL_VERSION,
        "io.modelcontextprotocol/clientInfo": { name: "obsidian-llm-hub", version: "1.0.0" },
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    };
  }

  private getRequestName(method: string, params?: Record<string, unknown>): string | null {
    if (method === "tools/call" || method === "prompts/get") {
      return typeof params?.name === "string" ? params.name : null;
    }
    if (method === "resources/read") {
      return typeof params?.uri === "string" ? params.uri : null;
    }
    return null;
  }

  private unwrapResult(result: unknown, modern: boolean): unknown {
    if (!modern || !result || typeof result !== "object") return result;
    const resultType = (result as Record<string, unknown>).resultType;
    if (resultType !== "complete") {
      const label = typeof resultType === "string" ? resultType : resultType === undefined ? "missing" : "invalid";
      throw new Error(`Unsupported MCP result type: ${label}`);
    }
    return result;
  }

  private getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object") return undefined;
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }

  private shouldFallbackToLegacy(error: unknown): boolean {
    const status = this.getErrorStatus(error);
    if (status === 400 || status === 404 || status === 405) return true;
    if (status === 401 || status === 403 || (status !== undefined && status >= 500)) return false;
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("-32601") || message.includes("-32022") || message.includes("Unsupported protocol version");
  }

  /**
   * Parse SSE (Server-Sent Events) response to extract JSON-RPC result
   */
  private parseSSEResponse(sseText: string, expectedId: number, modern: boolean): unknown {
    for (const event of sseText.split(/\r?\n\r?\n/)) {
      const data = event.split(/\r?\n/)
        .filter(line => line.startsWith("data:"))
        .map(line => line.slice(5).replace(/^ /, ""))
        .join("\n");
      if (!data) continue;
      const jsonResponse = JSON.parse(data) as JsonRpcResponse;
      if (jsonResponse.id !== expectedId) continue;
      if (jsonResponse.error) {
        throw new Error(`MCP Error ${jsonResponse.error.code}: ${jsonResponse.error.message}`);
      }
      return this.unwrapResult(jsonResponse.result, modern);
    }
    throw new Error("No matching JSON-RPC response received in SSE stream");
  }

  /**
   * Initialize the MCP session
   */
  async initialize(): Promise<McpInitializeResult> {
    if (this.initialized && this.cachedInitResult) {
      return this.cachedInitResult;
    }

    this.protocolEra = "modern";
    this.negotiatedProtocolVersion = MODERN_PROTOCOL_VERSION;
    try {
      const discover = await this.sendRequest("server/discover", {}) as McpDiscoverResult;
      if (!discover.supportedVersions?.includes(MODERN_PROTOCOL_VERSION)) {
        this.protocolEra = null;
      } else {
        const result: McpInitializeResult = {
          protocolVersion: MODERN_PROTOCOL_VERSION,
          capabilities: discover.capabilities || {},
          serverInfo: discover._meta?.["io.modelcontextprotocol/serverInfo"] || {
            name: this.config.name,
            version: "unknown",
          },
        };
        this.initialized = true;
        this.cachedInitResult = result;
        return result;
      }
    } catch (error) {
      if (!this.shouldFallbackToLegacy(error)) throw error;
    }
    return this.initializeLegacy();
  }

  private async initializeLegacy(): Promise<McpInitializeResult> {
    this.protocolEra = "legacy";
    this.negotiatedProtocolVersion = LEGACY_PROTOCOL_VERSION;
    const result = await this.sendRequest("initialize", {
      protocolVersion: LEGACY_PROTOCOL_VERSION,
      capabilities: MCP_APPS_CLIENT_CAPABILITIES,
      clientInfo: {
        name: "obsidian-llm-hub",
        version: "1.0.0",
      },
    }) as McpInitializeResult;

    if (!SUPPORTED_LEGACY_PROTOCOL_VERSIONS.has(result.protocolVersion)) {
      throw new Error(`MCP server negotiated unsupported protocol version: ${result.protocolVersion}`);
    }
    this.negotiatedProtocolVersion = result.protocolVersion;

    // Send initialized notification
    await this.sendNotification("notifications/initialized");

    this.initialized = true;
    this.cachedInitResult = result;
    return result;
  }

  /**
   * Send a notification (no response expected)
   */
  private async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      ...this.config.headers,
    };

    if (this.negotiatedProtocolVersion) {
      headers["MCP-Protocol-Version"] = this.negotiatedProtocolVersion;
    }

    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }

    // Notifications don't have an id
    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    try {
      await requestUrl({
        url: this.config.url,
        method: "POST",
        headers,
        body: JSON.stringify(notification),
      });
    } catch {
      // Notifications may not return anything, ignore errors
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<McpToolInfo[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const result = await this.sendRequest("tools/list") as McpToolsListResult;
    this.toolsCacheTtlMs = this.protocolEra === "modern"
      ? Math.max(0, result.ttlMs ?? 0)
      : null;
    return result.tools || [];
  }

  getToolsCacheTtlMs(): number | null {
    return this.toolsCacheTtlMs;
  }

  /**
   * Call a tool on the MCP server (returns full result with UI metadata)
   */
  async callToolRaw(toolName: string, args?: Record<string, unknown>, skipApproval?: boolean): Promise<McpToolCallResult> {
    if (!skipApproval) await requireMcpApproval(this.config, toolName, args || {});
    if (!this.initialized) {
      await this.initialize();
    }

    const result = await this.sendRequest("tools/call", {
      name: toolName,
      arguments: args || {},
    }) as McpToolCallResult;

    return result;
  }

  /**
   * Call a tool and return MCP Apps result if available
   */
  async callToolWithUi(toolName: string, args?: Record<string, unknown>, skipApproval?: boolean): Promise<McpAppResult> {
    const result = await this.callToolRaw(toolName, args, skipApproval);
    return mapToolCallToAppResult(result);
  }

  async readResource(uri: string): Promise<McpAppUiResource | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this.sendRequest("resources/read", {
        uri,
      }) as McpResourceReadResult;
      return mapResourceReadResult(result);
    } catch (error) {
      console.error(`Failed to read resource ${uri}:`, error);
      return null;
    }
  }

  /**
   * Close the MCP session
   */
  async close(): Promise<void> {
    if (this.sessionId) {
      try {
        const headers: Record<string, string> = {
          ...this.config.headers,
        };
        headers["Mcp-Session-Id"] = this.sessionId;

        await requestUrl({
          url: this.config.url,
          method: "DELETE",
          headers,
        });
      } catch {
        // Ignore close errors
      }
      this.sessionId = null;
    }
    this.initialized = false;
    this.cachedInitResult = null;
    this.protocolEra = null;
    this.toolsCacheTtlMs = null;
    this.negotiatedProtocolVersion = null;
  }
}

/**
 * Factory function to create the appropriate MCP client based on transport type
 */
export function createMcpClient(config: McpServerConfig): IMcpClient {
  if (config.transport === "stdio") {
    // Dynamic import to avoid loading child_process on mobile
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Keep stdio-only Node code out of the mobile startup path.
    const { McpStdioClient } = require("./mcpStdioClient") as typeof import("./mcpStdioClient");
    return new McpStdioClient(config);
  }
  return new McpHttpClient(config);
}
