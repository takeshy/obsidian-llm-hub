import type { IncomingMessage, Server, ServerResponse } from "http";
import type { ToolDefinition } from "src/types";
import { getNodeModule } from "./cliProvider";

type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

const PROTOCOL_VERSION = "2025-11-25";
const MAX_REQUEST_BYTES = 16 * 1024 * 1024;
const READ_ONLY_TOOLS = new Set([
  "read_timeline",
  "read_note",
  "search_notes",
  "list_notes",
  "list_folders",
  "get_active_note_info",
]);
const DESTRUCTIVE_TOOLS = new Set(["propose_delete", "bulk_propose_delete"]);

/**
 * Loopback-only MCP bridge used by Codex CLI for Obsidian-aware Vault reads and
 * Vault mutations. New files may be created directly with create_note, while
 * changes to existing files use the plugin's confirmation-gated propose tools.
 * The bridge never exposes direct update/apply tools.
 */
export class CodexVaultMcpBridge {
  private server: Server | null = null;
  private token = "";
  private url: string | null = null;

  constructor(
    private tools: ToolDefinition[],
    private executeTool: ToolExecutor,
  ) {}

  setExecutor(executeTool: ToolExecutor): void {
    this.executeTool = executeTool;
  }

  setTools(tools: ToolDefinition[]): void {
    this.tools = tools;
  }

  async start(): Promise<string> {
    if (this.server && this.url) return this.url;
    const http = getNodeModule<typeof import("http")>("http");
    const crypto = getNodeModule<typeof import("crypto")>("crypto");
    this.token = crypto.randomBytes(24).toString("hex");
    this.server = http.createServer((request, response) => {
      void this.handleHttpRequest(request, response);
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(0, "127.0.0.1", () => resolve());
    });
    const address = this.server.address();
    if (!address || typeof address === "string") {
      await this.stop();
      throw new Error("Could not determine Codex Vault MCP bridge port");
    }
    this.url = `http://127.0.0.1:${address.port}/mcp?token=${this.token}`;
    return this.url;
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = null;
    this.url = null;
    this.token = "";
    if (!server) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  async handleRequest(request: JsonRpcRequest): Promise<Record<string, unknown> | null> {
    console.warn("[LLM Hub Codex MCP] request", {
      method: request.method,
      id: request.id,
      tool: typeof request.params?.name === "string" ? request.params.name : undefined,
    });
    if (request.method === "notifications/initialized") return null;
    if (request.method === "initialize") {
      const requestedVersion = typeof request.params?.protocolVersion === "string"
        ? request.params.protocolVersion
        : PROTOCOL_VERSION;
      return {
        protocolVersion: requestedVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "obsidian-llm-hub-vault", version: "1.0.0" },
      };
    }
    if (request.method === "ping") return {};
    if (request.method === "tools/list") {
      return {
        tools: this.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.parameters,
          annotations: {
            readOnlyHint: READ_ONLY_TOOLS.has(tool.name),
            destructiveHint: DESTRUCTIVE_TOOLS.has(tool.name),
            idempotentHint: READ_ONLY_TOOLS.has(tool.name),
            openWorldHint: false,
          },
        })),
      };
    }
    if (request.method === "tools/call") {
      const name = typeof request.params?.name === "string" ? request.params.name : "";
      const args = request.params?.arguments && typeof request.params.arguments === "object"
        ? request.params.arguments as Record<string, unknown>
        : {};
      if (!this.tools.some((tool) => tool.name === name)) {
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
      }
      try {
        const result = await this.executeTool(name, args);
        const isError = result.success === false || typeof result.error === "string";
        console.warn("[LLM Hub Codex MCP] tool result", { name, isError });
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: result,
          ...(isError ? { isError: true } : {}),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[LLM Hub Codex MCP] tool failed", { name, message });
        return { content: [{ type: "text", text: message }], isError: true };
      }
    }
    throw Object.assign(new Error(`Method not found: ${request.method}`), { code: -32601 });
  }

  private async handleHttpRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    if (requestUrl.pathname !== "/mcp" || requestUrl.searchParams.get("token") !== this.token) {
      console.warn("[LLM Hub Codex MCP] rejected request", { method: request.method, path: requestUrl.pathname });
      response.writeHead(403).end("Forbidden");
      return;
    }
    if (request.method === "DELETE") {
      response.writeHead(200).end();
      return;
    }
    if (request.method !== "POST") {
      response.writeHead(405, { Allow: "POST, DELETE" }).end();
      return;
    }

    try {
      const body = await this.readBody(request);
      const rpcRequest = JSON.parse(body) as JsonRpcRequest;
      const result = await this.handleRequest(rpcRequest);
      if (rpcRequest.id === undefined || result === null) {
        response.writeHead(202).end();
        return;
      }
      this.sendJson(response, { jsonrpc: "2.0", id: rpcRequest.id, result });
    } catch (error) {
      const rpcError = error as Error & { code?: number };
      this.sendJson(response, {
        jsonrpc: "2.0",
        id: null,
        error: { code: rpcError.code ?? -32603, message: rpcError.message || "Internal error" },
      });
    }
  }

  private readBody(request: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      request.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_REQUEST_BYTES) {
          reject(new Error("MCP request is too large"));
          request.destroy();
          return;
        }
        chunks.push(chunk);
      });
      request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      request.on("error", (error: Error) => reject(error));
    });
  }

  private sendJson(response: ServerResponse, value: unknown): void {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(value));
  }
}
