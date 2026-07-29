// MCP (Model Context Protocol) client for stdio transport
// Spawns a local process and communicates via stdin/stdout using JSON-RPC 2.0

import { Platform } from "obsidian";
import type { McpServerConfig, McpToolInfo, McpAppResult, McpAppUiResource } from "../types";
import type {
  IMcpClient,
  McpInitializeResult,
  McpToolsListResult,
  McpToolCallResult,
  McpResourceReadResult,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
} from "./mcpClient";
import { mapToolCallToAppResult, mapResourceReadResult } from "./mcpClientUtils";
import { getChildProcess, type ChildProcessType } from "./cliProvider";

const MODERN_PROTOCOL_VERSION = "2026-07-28";
const LEGACY_PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_LEGACY_PROTOCOL_VERSIONS = new Set([
  LEGACY_PROTOCOL_VERSION,
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
]);

type McpProtocolEra = "modern" | "legacy";

interface McpDiscoverResult {
  supportedVersions: string[];
  capabilities?: McpInitializeResult["capabilities"];
  _meta?: {
    "io.modelcontextprotocol/serverInfo"?: McpInitializeResult["serverInfo"];
  };
}

/**
 * MCP Client for communicating with local MCP servers via stdio transport.
 * Spawns a child process and uses stdin/stdout for JSON-RPC 2.0 communication.
 * Supports two framing protocols: content-length (LSP-style) and newline-delimited.
 */
export class McpStdioClient implements IMcpClient {
  private process: ChildProcessType | null = null;
  private nextId = 1;
  private pending = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }>();
  private readBuffer = Buffer.alloc(0);
  private initialized = false;
  private stderrLog: string[] = [];
  private config: McpServerConfig;
  private protocolEra: McpProtocolEra | null = null;
  private cachedInitResult: McpInitializeResult | null = null;
  private toolsCacheTtlMs: number | null = null;
  constructor(config: McpServerConfig) {
    if (Platform.isMobile) {
      throw new Error("Stdio MCP transport is not available on mobile");
    }
    if (!config.command) {
      throw new Error("Stdio MCP transport requires a command");
    }
    this.config = config;
  }

  private get framing(): "content-length" | "newline" {
    // Explicit setting takes priority
    if (this.config.framing) return this.config.framing;
    // Newline-delimited JSON is the standard MCP stdio framing.
    return "newline";
  }

  /**
   * Initialize the MCP session - spawns the process and performs handshake
   */
  async initialize(): Promise<McpInitializeResult> {
    if (this.initialized && this.cachedInitResult) {
      return this.cachedInitResult;
    }

    // Spawn the process
    this.startProcess();

    this.protocolEra = "modern";
    try {
      const discover = await this.sendRequest("server/discover", {}, 5000) as McpDiscoverResult;
      if (discover.supportedVersions?.includes(MODERN_PROTOCOL_VERSION)) {
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
    } catch {
      // A 2025-era server reports MethodNotFound/UnsupportedProtocolVersion.
    }

    this.protocolEra = "legacy";
    const result = await this.sendRequest("initialize", {
      protocolVersion: LEGACY_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: "obsidian-llm-hub",
        version: "1.0.0",
      },
    }, 120000) as McpInitializeResult;

    if (!SUPPORTED_LEGACY_PROTOCOL_VERSIONS.has(result.protocolVersion)) {
      throw new Error(`MCP server negotiated unsupported protocol version: ${result.protocolVersion}`);
    }

    // Send initialized notification
    this.sendNotification("notifications/initialized");

    this.initialized = true;
    this.cachedInitResult = result;
    return result;
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
  async callToolRaw(toolName: string, args?: Record<string, unknown>): Promise<McpToolCallResult> {
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
  async callToolWithUi(toolName: string, args?: Record<string, unknown>): Promise<McpAppResult> {
    const result = await this.callToolRaw(toolName, args);
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
   * Close the MCP session and stop the process
   */
  async close(): Promise<void> {
    this.initialized = false;
    this.cachedInitResult = null;
    this.protocolEra = null;
    this.toolsCacheTtlMs = null;
    const proc = this.process;
    this.process = null;

    // Reject all pending requests
    for (const [, handler] of this.pending) {
      handler.reject(new Error("MCP client stopped"));
    }
    this.pending.clear();

    if (proc && !proc.killed) {
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          if (proc.exitCode === null && proc.signalCode === null) {
            proc.kill("SIGKILL");
          }
        }, 3000);
        proc.on("close", () => {
          window.clearTimeout(timer);
          resolve();
        });
        proc.kill("SIGTERM");
      });
    }
  }

  // --- Private methods ---

  private startProcess(): void {
    const { spawn } = getChildProcess();

    const command = this.config.command!;
    const args = this.config.args || [];
    const childEnv = typeof process !== "undefined"
      ? { ...process.env, ...this.config.env }
      : { ...this.config.env };

    this.process = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      env: childEnv,
    });

    this.process.stdout!.on("data", (data: Buffer) => {
      this.handleData(data);
    });

    this.process.stderr!.on("data", (data: Buffer) => {
      const msg = data.toString("utf8").trim();
      if (msg) {
        this.stderrLog.push(msg);
        if (this.stderrLog.length > 20) this.stderrLog.shift();
      }
    });

    this.process.stdin!.on("error", (err: Error) => {
      console.error("[MCP stdin error]", this.config.name, err.message);
    });

    this.process.on("error", (err: Error) => {
      console.error("[MCP process error]", this.config.name, err.message);
      this.initialized = false;
    });

    this.process.on("close", (code: number | null) => {
      this.initialized = false;
      const stderrMsg = this.stderrLog.join("\n");
      // Reject all pending requests
      for (const [, handler] of this.pending) {
        handler.reject(new Error(
          `MCP process closed (code=${code})${stderrMsg ? ": " + stderrMsg : ""}`
        ));
      }
      this.pending.clear();
    });
  }

  private serializeMessage(message: JsonRpcRequest | JsonRpcNotification): string {
    const json = JSON.stringify(message);
    if (this.framing === "newline") {
      return json + "\n";
    }
    // Content-Length framing (LSP-style)
    return `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`;
  }

  private writeToStdin(data: string): void {
    if (!this.process?.stdin || this.process.stdin.destroyed) return;
    try {
      this.process.stdin.write(data);
    } catch {
      // stdin write failed - process likely closing
    }
  }

  private sendRequest(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs?: number,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process || this.process.killed) {
        reject(new Error("MCP process not running"));
        return;
      }

      const id = this.nextId++;
      const modern = this.protocolEra === "modern" || method === "server/discover";
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method,
        params: modern ? this.withModernMetadata(params || {}) : params,
      };

      const effectiveTimeout = timeoutMs ?? (method === "initialize" ? 120000 : 30000);
      const timeout = window.setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`MCP request timed out: ${method}`));
        }
      }, effectiveTimeout);

      this.pending.set(id, {
        resolve: (value) => {
          window.clearTimeout(timeout);
          if (modern) {
            const resultType = value && typeof value === "object"
              ? (value as Record<string, unknown>).resultType
              : undefined;
            if (resultType !== "complete") {
              const label = typeof resultType === "string" ? resultType : resultType === undefined ? "missing" : "invalid";
              reject(new Error(`Unsupported MCP result type: ${label}`));
              return;
            }
          }
          resolve(value);
        },
        reject: (reason) => {
          window.clearTimeout(timeout);
          reject(reason);
        },
      });

      this.writeToStdin(this.serializeMessage(request));
    });
  }

  private withModernMetadata(params: Record<string, unknown>): Record<string, unknown> {
    const existingMeta = params._meta && typeof params._meta === "object"
      ? params._meta as Record<string, unknown>
      : {};
    return {
      ...params,
      _meta: {
        ...existingMeta,
        "io.modelcontextprotocol/protocolVersion": MODERN_PROTOCOL_VERSION,
        "io.modelcontextprotocol/clientInfo": { name: "obsidian-llm-hub", version: "1.0.0" },
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    };
  }

  private sendNotification(method: string, params?: Record<string, unknown>): void {
    if (!this.process || this.process.killed) return;

    const notification: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      ...(params ? { params } : {}),
    };

    this.writeToStdin(this.serializeMessage(notification));
  }

  private handleData(data: Buffer): void {
    this.readBuffer = Buffer.concat([this.readBuffer, data]);
    if (this.framing === "newline") {
      this.parseNewlineDelimited();
    } else {
      this.parseContentLength();
    }
  }

  // Parse newline-delimited JSON messages (Python MCP SDK)
  private parseNewlineDelimited(): void {
    while (true) {
      const newlineIdx = this.readBuffer.indexOf(0x0a); // \n
      if (newlineIdx === -1) break;

      const line = this.readBuffer.subarray(0, newlineIdx).toString("utf8").trim();
      this.readBuffer = this.readBuffer.subarray(newlineIdx + 1);

      if (!line) continue;

      try {
        const message = JSON.parse(line) as JsonRpcResponse;
        this.dispatchMessage(message);
      } catch {
        // Skip unparseable lines
      }
    }
  }

  // Parse Content-Length framed messages (TypeScript MCP SDK)
  private parseContentLength(): void {
    while (true) {
      const separator = "\r\n\r\n";
      const separatorIdx = this.readBuffer.indexOf(separator);
      if (separatorIdx === -1) break;

      const header = this.readBuffer.subarray(0, separatorIdx).toString("utf8");
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        this.readBuffer = this.readBuffer.subarray(separatorIdx + separator.length);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = separatorIdx + separator.length;

      if (this.readBuffer.length < bodyStart + contentLength) break;

      const body = this.readBuffer.subarray(bodyStart, bodyStart + contentLength).toString("utf8");
      this.readBuffer = this.readBuffer.subarray(bodyStart + contentLength);

      try {
        const message = JSON.parse(body) as JsonRpcResponse;
        this.dispatchMessage(message);
      } catch {
        // Skip unparseable messages
      }
    }
  }

  private dispatchMessage(message: JsonRpcResponse): void {
    if (message.id != null && this.pending.has(message.id)) {
      const handler = this.pending.get(message.id)!;
      this.pending.delete(message.id);

      if (message.error) {
        handler.reject(
          new Error(`MCP error (${message.error.code}): ${message.error.message}`)
        );
      } else {
        handler.resolve(message.result);
      }
    }
    // Ignore notifications from server (no id)
  }
}
