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
import { DEFAULT_SETTINGS, type PrivacySettings } from "src/types";
import { formatError } from "src/utils/error";

export type ToolResult = Record<string, unknown>;

// Context for tool execution
export interface ToolExecutionContext {
  listNotesLimit?: number;
  maxNoteChars?: number;
  isCloudProvider?: boolean;
  privacySettings?: PrivacySettings;
}

const PRIVACY_DENIED_MSG = "Access denied: this note is marked as private and cannot be accessed by cloud providers.";

export function isFilePrivate(app: App, filePath: string, settings: PrivacySettings): boolean {
  if (!settings.enabled) return false;

  let resolvedPath = filePath;
  let resolvedFile = app.vault.getAbstractFileByPath(filePath);
  if (!resolvedFile || !(resolvedFile instanceof TFile)) {
    const found = findFileByName(app, filePath);
    if (found) {
      resolvedPath = found.path;
      resolvedFile = found;
    }
  }

  const normalizedPath = resolvedPath.toLowerCase();
  for (const folder of settings.privateFolders) {
    const normalizedFolder = folder.toLowerCase().replace(/\/$/, "");
    if (normalizedPath.startsWith(normalizedFolder + "/") || normalizedPath === normalizedFolder) {
      return true;
    }
  }

  if (resolvedFile instanceof TFile) {
    const cache = app.metadataCache.getFileCache(resolvedFile);
    const tags: unknown = cache?.frontmatter?.tags;
    if (Array.isArray(tags) && tags.includes(settings.privateTag)) {
      return true;
    }
  }

  return false;
}

function privacyBlocked(context: ToolExecutionContext | undefined): boolean {
  return !!(context?.isCloudProvider && context?.privacySettings?.enabled);
}

function checkFilePrivacy(app: App, filePath: string, context: ToolExecutionContext | undefined): ToolResult | null {
  if (!privacyBlocked(context)) return null;
  if (isFilePrivate(app, filePath, context!.privacySettings!)) {
    return { success: false, error: PRIVACY_DENIED_MSG };
  }
  return null;
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
      if (fileName) {
        const denied = checkFilePrivacy(app, fileName, context);
        if (denied) return denied;
      }
      if (args.activeNote && privacyBlocked(context)) {
        const activeFile = app.workspace.getActiveFile();
        if (activeFile && isFilePrivate(app, activeFile.path, context!.privacySettings!)) {
          return { success: false, error: PRIVACY_DENIED_MSG };
        }
      }
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
      if (folder) {
        const denied = checkFilePrivacy(app, folder + "/", context);
        if (denied) return denied;
      }
      return createNote(
        app,
        name,
        asString(args.content) || "",
        folder,
        asString(args.tags)
      );
    }

    case "update_note": {
      const updateFileName = asString(args.fileName);
      if (updateFileName) {
        const denied = checkFilePrivacy(app, updateFileName, context);
        if (denied) return denied;
      }
      if (args.activeNote && privacyBlocked(context)) {
        const activeFile = app.workspace.getActiveFile();
        if (activeFile && isFilePrivate(app, activeFile.path, context!.privacySettings!)) {
          return { success: false, error: PRIVACY_DENIED_MSG };
        }
      }
      return updateNote(
        app,
        updateFileName,
        args.activeNote as boolean | undefined,
        asString(args.newContent),
        (asString(args.mode) as "replace" | "append" | "prepend") || "replace"
      );
    }

    case "delete_note": {
      const deleteFileName = asString(args.fileName);
      if (!deleteFileName) {
        return { success: false, error: "Required parameter 'fileName' is missing" };
      }
      const denied = checkFilePrivacy(app, deleteFileName, context);
      if (denied) return denied;
      return deleteNote(app, deleteFileName);
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
      const denied = checkFilePrivacy(app, oldPath, context);
      if (denied) return denied;
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
      const privacyFilter = privacyBlocked(context)
        ? (f: TFile) => isFilePrivate(app, f.path, context!.privacySettings!)
        : undefined;

      if (searchContent) {
        const results = await searchByContent(app, query, limit, privacyFilter);
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
        const results = searchByName(app, query, limit, privacyFilter);
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
      const privacyFilter = privacyBlocked(context)
        ? (f: TFile) => isFilePrivate(app, f.path, context!.privacySettings!)
        : undefined;
      const { results, totalCount, hasMore } = listNotes(app, folder, recursive, limit, privacyFilter);
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
      const folders = listFolders(app, parentFolder);
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
      return createFolder(app, path);
    }

    case "get_active_note_info": {
      if (privacyBlocked(context)) {
        const activeFile = app.workspace.getActiveFile();
        if (activeFile && isFilePrivate(app, activeFile.path, context!.privacySettings!)) {
          return { success: false, error: PRIVACY_DENIED_MSG };
        }
      }
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
      const editFileName = asString(args.fileName);
      if (editFileName) {
        const denied = checkFilePrivacy(app, editFileName, context);
        if (denied) return denied;
      }
      if (args.activeNote && privacyBlocked(context)) {
        const activeFile = app.workspace.getActiveFile();
        if (activeFile && isFilePrivate(app, activeFile.path, context!.privacySettings!)) {
          return { success: false, error: PRIVACY_DENIED_MSG };
        }
      }
      return proposeEdit(
        app,
        editFileName,
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
      const proposeDeleteFileName = asString(args.fileName);
      if (!proposeDeleteFileName) {
        return { success: false, error: "Required parameter 'fileName' is missing" };
      }
      const denied = checkFilePrivacy(app, proposeDeleteFileName, context);
      if (denied) return denied;
      return proposeDelete(app, proposeDeleteFileName);
    }

    case "apply_delete":
      return applyDelete(app);

    case "discard_delete":
      return discardDelete(app);

    case "bulk_propose_edit": {
      let edits = args.edits as Array<{
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
      if (privacyBlocked(context)) {
        edits = edits.filter(e => !isFilePrivate(app, e.fileName, context!.privacySettings!));
        if (edits.length === 0) return { success: false, error: PRIVACY_DENIED_MSG };
      }
      return proposeBulkEdit(app, edits);
    }

    case "bulk_propose_rename": {
      let renames = args.renames as Array<{ oldPath: string; newPath: string }>;
      if (!renames || !Array.isArray(renames) || renames.length === 0) {
        return {
          success: false,
          error: "No renames provided. The 'renames' array is required.",
        };
      }
      if (privacyBlocked(context)) {
        renames = renames.filter(r => !isFilePrivate(app, r.oldPath, context!.privacySettings!));
        if (renames.length === 0) return { success: false, error: PRIVACY_DENIED_MSG };
      }
      return proposeBulkRename(app, renames);
    }

    case "bulk_propose_delete": {
      let fileNames = args.fileNames as string[];
      if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
        return {
          success: false,
          error: "No files provided. The 'fileNames' array is required.",
        };
      }
      if (privacyBlocked(context)) {
        fileNames = fileNames.filter(f => !isFilePrivate(app, f, context!.privacySettings!));
        if (fileNames.length === 0) return { success: false, error: PRIVACY_DENIED_MSG };
      }
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
