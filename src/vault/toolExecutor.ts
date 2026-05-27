import { TFile, type App } from "obsidian";
import {
  readNote,
  createNote,
  updateNote,
  deleteNote,
  getActiveNoteInfo,
  proposeEdit,
  applyEdit,
  discardEdit,
  proposeDelete,
  applyDelete,
  discardDelete,
  proposeRename,
  proposeBulkEdit,
  proposeBulkDelete,
  proposeBulkRename,
  findFileByName,
} from "./notes";
import {
  searchByName,
  searchByContent,
  listNotes,
  listFolders,
  createFolder,
} from "./search";
import { DEFAULT_SETTINGS } from "src/types";
import { formatError } from "src/utils/error";
import {
  CLOUD_VAULT_SCOPE_DENIED_MSG,
  isFileAllowedForCloudVaultTools,
  isPathInAllowedVaultFolders,
} from "./cloudVaultScope";

export type ToolResult = Record<string, unknown>;

// Context for tool execution
export interface ToolExecutionContext {
  listNotesLimit?: number;
  maxNoteChars?: number;
  isCloudProvider?: boolean;
  cloudVaultToolAllowedFolders?: string[];
}

function hasCloudVaultToolScope(context: ToolExecutionContext | undefined): boolean {
  return !!(context?.isCloudProvider && context.cloudVaultToolAllowedFolders && context.cloudVaultToolAllowedFolders.length > 0);
}

function cloudVaultToolFileFilter(context: ToolExecutionContext | undefined): ((file: TFile) => boolean) | undefined {
  if (!hasCloudVaultToolScope(context)) return undefined;
  return (file) => isFileAllowedForCloudVaultTools(file, context!.cloudVaultToolAllowedFolders);
}

function resolveToolFile(app: App, fileName: string | undefined, activeNote: boolean | undefined): TFile | null {
  if (activeNote) return app.workspace.getActiveFile();
  if (!fileName) return null;
  const direct = app.vault.getAbstractFileByPath(fileName);
  if (direct instanceof TFile) return direct;
  return findFileByName(app, fileName);
}

function denyIfCloudVaultToolPathOutsideScope(path: string, context: ToolExecutionContext | undefined): ToolResult | null {
  if (!hasCloudVaultToolScope(context)) return null;
  return isPathInAllowedVaultFolders(path, context!.cloudVaultToolAllowedFolders)
    ? null
    : { success: false, error: CLOUD_VAULT_SCOPE_DENIED_MSG };
}

function denyIfCloudVaultToolFileOutsideScope(
  app: App,
  fileName: string | undefined,
  activeNote: boolean | undefined,
  context: ToolExecutionContext | undefined,
): ToolResult | null {
  if (!hasCloudVaultToolScope(context)) return null;
  const file = resolveToolFile(app, fileName, activeNote);
  if (!file) return null;
  return isFileAllowedForCloudVaultTools(file, context!.cloudVaultToolAllowedFolders)
    ? null
    : { success: false, error: CLOUD_VAULT_SCOPE_DENIED_MSG };
}

// Execute a tool call and return the result
export async function executeToolCall(
  app: App,
  toolName: string,
  args: Record<string, unknown>,
  context?: ToolExecutionContext
): Promise<ToolResult> {
  try {
    return await executeToolCallInternal(app, toolName, args, context);
  } catch (error) {
    return {
      success: false,
      error: formatError(error),
      toolName,
    };
  }
}

// Coerce an AI-provided argument to string (AI may send numbers or other types)
function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  // Avoid [object Object] for complex types
  try { return JSON.stringify(value); } catch { return undefined; }
}

// Internal function that may throw
async function executeToolCallInternal(
  app: App,
  toolName: string,
  args: Record<string, unknown>,
  context?: ToolExecutionContext
): Promise<ToolResult> {
  switch (toolName) {
    case "read_note": {
      const fileName = asString(args.fileName);
      const denied = denyIfCloudVaultToolFileOutsideScope(app, fileName, args.activeNote as boolean | undefined, context);
      if (denied) return denied;
      return readNote(
        app,
        fileName,
        args.activeNote as boolean | undefined,
        context?.maxNoteChars ?? DEFAULT_SETTINGS.maxNoteChars
      );
    }

    case "create_note": {
      let name = asString(args.name);
      let folder = asString(args.folder);
      if (!name && args.path) {
        // Fallback: extract name and folder from path argument
        const pathStr = asString(args.path) || "";
        const lastSlash = pathStr.lastIndexOf("/");
        if (lastSlash >= 0) {
          name = pathStr.slice(lastSlash + 1);
          folder = folder ?? pathStr.slice(0, lastSlash);
        } else {
          name = pathStr;
        }
      }
      if (!name) {
        return { success: false, error: "Required parameter 'name' is missing" };
      }
      if (args.content == null) {
        return { success: false, error: "Required parameter 'content' is missing" };
      }
      const targetPath = folder ? `${folder}/${name}` : name;
      const denied = denyIfCloudVaultToolPathOutsideScope(targetPath, context);
      if (denied) return denied;
      return createNote(
        app,
        name,
        asString(args.content) || "",
        folder,
        asString(args.tags)
      );
    }

    case "update_note": {
      const fileName = asString(args.fileName);
      const denied = denyIfCloudVaultToolFileOutsideScope(app, fileName, args.activeNote as boolean | undefined, context);
      if (denied) return denied;
      return updateNote(
        app,
        fileName,
        args.activeNote as boolean | undefined,
        asString(args.newContent),
        (asString(args.mode) as "replace" | "append" | "prepend") || "replace"
      );
    }

    case "delete_note": {
      const fileName = asString(args.fileName);
      if (!fileName) {
        return { success: false, error: "Required parameter 'fileName' is missing" };
      }
      const denied = denyIfCloudVaultToolFileOutsideScope(app, fileName, false, context);
      if (denied) return denied;
      return deleteNote(app, fileName);
    }

    case "rename_note": {
      const oldPath = asString(args.oldPath);
      const newPath = asString(args.newPath);
      if (!oldPath) {
        return { success: false, error: "Required parameter 'oldPath' is missing" };
      }
      if (!newPath) {
        return { success: false, error: "Required parameter 'newPath' is missing" };
      }
      const deniedOldPath = denyIfCloudVaultToolFileOutsideScope(app, oldPath, false, context);
      if (deniedOldPath) return deniedOldPath;
      const deniedNewPath = denyIfCloudVaultToolPathOutsideScope(newPath, context);
      if (deniedNewPath) return deniedNewPath;
      return proposeRename(app, oldPath, newPath);
    }

    case "search_notes": {
      const query = asString(args.query);
      if (!query) {
        return { success: false, error: "Required parameter 'query' is missing" };
      }
      const searchContent = args.searchContent as boolean | undefined;
      const parsedLimit = args.limit ? parseInt(asString(args.limit) || "10", 10) : 10;
      const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 10 : parsedLimit;
      const fileFilter = cloudVaultToolFileFilter(context);

      if (searchContent) {
        const results = await searchByContent(app, query, limit, fileFilter);
        return {
          success: true,
          results: results.map((r) => ({
            name: r.name,
            path: r.path,
            matchedContent: r.matchedContent,
          })),
          count: results.length,
        };
      } else {
        const results = searchByName(app, query, limit, fileFilter);
        return {
          success: true,
          results: results.map((r) => ({ name: r.name, path: r.path })),
          count: results.length,
        };
      }
    }

    case "list_notes": {
      const folder = asString(args.folder);
      const recursive = args.recursive as boolean | undefined;
      const defaultLimit = context?.listNotesLimit ?? DEFAULT_SETTINGS.listNotesLimit;
      const parsedLimit = args.limit ? parseInt(asString(args.limit) || String(defaultLimit), 10) : defaultLimit;
      const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? defaultLimit : parsedLimit;
      const deniedFolder = folder ? denyIfCloudVaultToolPathOutsideScope(folder, context) : null;
      if (deniedFolder) return deniedFolder;
      const { results, totalCount, hasMore } = listNotes(app, folder, recursive, limit, cloudVaultToolFileFilter(context));
      return {
        success: true,
        notes: results.map((r) => ({ name: r.name, path: r.path })),
        count: results.length,
        totalCount,
        hasMore,
        message: hasMore
          ? `Showing ${results.length} of ${totalCount} notes. Use 'limit' parameter to see more.`
          : undefined,
      };
    }

    case "list_folders": {
      const parentFolder = asString(args.parentFolder);
      const denied = parentFolder ? denyIfCloudVaultToolPathOutsideScope(parentFolder, context) : null;
      if (denied) return denied;
      const folders = listFolders(app, parentFolder)
        .filter((folder) => isPathInAllowedVaultFolders(folder, hasCloudVaultToolScope(context) ? context!.cloudVaultToolAllowedFolders : undefined));
      return {
        success: true,
        folders,
        count: folders.length,
      };
    }

    case "create_folder": {
      const path = asString(args.path);
      if (!path) {
        return { success: false, error: "Required parameter 'path' is missing" };
      }
      const denied = denyIfCloudVaultToolPathOutsideScope(path, context);
      if (denied) return denied;
      return createFolder(app, path);
    }

    case "get_active_note_info": {
      const denied = denyIfCloudVaultToolFileOutsideScope(app, undefined, true, context);
      if (denied) return denied;
      const info = getActiveNoteInfo(app);
      if (info) {
        return { success: true, ...info };
      }
      return {
        success: false,
        error: "No active note found. Please open a note first.",
      };
    }

    case "propose_edit": {
      const fileName = asString(args.fileName);
      const denied = denyIfCloudVaultToolFileOutsideScope(app, fileName, args.activeNote as boolean | undefined, context);
      if (denied) return denied;
      return proposeEdit(
        app,
        fileName,
        args.activeNote as boolean | undefined,
        asString(args.newContent),
        (asString(args.mode) as "replace" | "append" | "prepend" | "patch") || "replace",
        undefined,
        args.patches as Array<{ search: string; replace: string }> | undefined
      );
    }

    case "apply_edit":
      return applyEdit(app);

    case "discard_edit":
      return discardEdit(app);

    case "propose_delete": {
      const fileName = asString(args.fileName);
      if (!fileName) {
        return { success: false, error: "Required parameter 'fileName' is missing" };
      }
      const denied = denyIfCloudVaultToolFileOutsideScope(app, fileName, false, context);
      if (denied) return denied;
      return proposeDelete(app, fileName);
    }

    case "apply_delete":
      return applyDelete(app);

    case "discard_delete":
      return discardDelete(app);

    case "bulk_propose_edit": {
      const edits = args.edits as Array<{
        fileName: string;
        newContent: string;
        mode?: "replace" | "append" | "prepend";
      }>;
      if (!edits || !Array.isArray(edits) || edits.length === 0) {
        return {
          success: false,
          error: "No edits provided. The 'edits' array is required.",
        };
      }
      const denied = edits
        .map((edit) => denyIfCloudVaultToolFileOutsideScope(app, edit.fileName, false, context))
        .find(Boolean);
      if (denied) return denied;
      return proposeBulkEdit(app, edits);
    }

    case "bulk_propose_rename": {
      const renames = args.renames as Array<{ oldPath: string; newPath: string }>;
      if (!renames || !Array.isArray(renames) || renames.length === 0) {
        return {
          success: false,
          error: "No renames provided. The 'renames' array is required.",
        };
      }
      const denied = renames
        .flatMap((rename) => [
          denyIfCloudVaultToolFileOutsideScope(app, rename.oldPath, false, context),
          denyIfCloudVaultToolPathOutsideScope(rename.newPath, context),
        ])
        .find(Boolean);
      if (denied) return denied;
      return proposeBulkRename(app, renames);
    }

    case "bulk_propose_delete": {
      const fileNames = args.fileNames as string[];
      if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
        return {
          success: false,
          error: "No files provided. The 'fileNames' array is required.",
        };
      }
      const denied = fileNames
        .map((fileName) => denyIfCloudVaultToolFileOutsideScope(app, fileName, false, context))
        .find(Boolean);
      if (denied) return denied;
      return proposeBulkDelete(app, fileNames);
    }

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
      };
  }
}

// Create a tool executor function bound to a specific app instance
export function createToolExecutor(
  app: App,
  context?: ToolExecutionContext
): (name: string, args: Record<string, unknown>) => Promise<unknown> {
  return async (name: string, args: Record<string, unknown>) => {
    return executeToolCall(app, name, args, context);
  };
}
