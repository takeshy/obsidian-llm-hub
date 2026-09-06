// Workflow vocabulary lives in obsidian-llm-hub-common; this file adds what only this plugin has.
import type { McpAppInfo, ChatProvider } from "src/types";
import type { PersistentCliSession } from "src/core/cliProvider";
import type { EditConfirmationResult } from "src/ui/components/workflow/EditConfirmationModal";

declare module "obsidian-llm-hub-common/workflow" {
  interface WorkflowHostContext {
    /** Persistent CLI sessions keyed by provider name, shared across workflow nodes */
    persistentCliSessions?: Map<ChatProvider, PersistentCliSession>;
  }
  interface WorkflowHostStep {
    mcpAppInfo?: McpAppInfo;  // MCP Apps UI info if available
  }
  interface WorkflowHostCallbacks {
    promptForConfirmation: (
      filePath: string,
      content: string,
      mode: string,
      originalContent?: string
    ) => Promise<EditConfirmationResult>;
    showMcpApp?: (mcpApp: McpAppInfo) => Promise<void>;
  }
}

export * from "obsidian-llm-hub-common/workflow";
