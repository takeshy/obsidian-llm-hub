// The HTTP transport, the approval gate and the client factory live in the shared library.
// This plugin registers its stdio transport with the factory at load.
export {
  McpHttpClient,
  createMcpClient,
  configureMcpStdioClient,
  configureMcpClientInfo,
  MCP_APPS_CLIENT_CAPABILITIES,
  type IMcpClient,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcNotification,
  type McpInitializeResult,
  type McpToolsListResult,
  type McpToolCallResult,
  type McpResourceReadResult,
} from "obsidian-llm-hub-common/mcp";
