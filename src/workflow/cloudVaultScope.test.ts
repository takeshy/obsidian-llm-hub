import { describe, expect, it } from "vitest";
import { App, TFile } from "obsidian";
import { handleNoteReadNode, handleNoteSearchNode } from "./handlers/note";
import { handleFileExplorerNode, handleFileSaveNode } from "./handlers/file";
import { handleObsidianCommandNode } from "./handlers/integration";
import { handlePromptFileNode, handlePromptSelectionNode } from "./handlers/prompt";
import type { ExecutionContext, WorkflowNode } from "./types";

function makeFile(path: string, content = ""): TFile {
  const file = new TFile();
  const name = path.split("/").pop() ?? path;
  const lastDot = name.lastIndexOf(".");
  file.path = path;
  file.name = name;
  file.basename = lastDot > 0 ? name.slice(0, lastDot) : name;
  file.extension = lastDot > 0 ? name.slice(lastDot + 1) : "";
  (file as TFile & { stat: { ctime: number; mtime: number } }).stat = { ctime: 1, mtime: 1 };
  (file as TFile & { _content: string })._content = content;
  return file;
}

function makeApp(files: TFile[]): App {
  return {
    vault: {
      getMarkdownFiles: () => files,
      getAbstractFileByPath: (path: string) => files.find((file) => file.path === path) ?? null,
      read: async (file: TFile) => (file as TFile & { _content: string })._content,
      cachedRead: async (file: TFile) => (file as TFile & { _content: string })._content,
      create: async () => undefined,
    },
    metadataCache: {
      getCache: () => null,
    },
    workspace: {
      iterateAllLeaves: () => undefined,
      getLeaf: () => ({
        openFile: async () => undefined,
      }),
      setActiveLeaf: () => undefined,
    },
    commands: {
      commands: {
        "editor:save-file": {},
      },
      executeCommandById: async () => undefined,
    },
  } as unknown as App;
}

function makeContext(allowedFolders?: string[]): ExecutionContext {
  return {
    variables: new Map(),
    logs: [],
    cloudVaultToolAllowedFolders: allowedFolders,
  };
}

function makeNode(type: WorkflowNode["type"], properties: Record<string, string>): WorkflowNode {
  return {
    id: "node",
    type,
    canvasNodeId: "canvas-node",
    properties,
  };
}

describe("workflow LLM vault scope", () => {
  it("blocks note-read outside configured folders", async () => {
    const app = makeApp([makeFile("Private/Secret.md", "secret")]);
    const context = makeContext(["Public"]);
    const node = makeNode("note-read", { path: "Private/Secret.md", saveTo: "content" });

    await expect(handleNoteReadNode(node, context, app)).rejects.toThrow("Access denied");
  });

  it("filters note-search results to configured folders", async () => {
    const app = makeApp([
      makeFile("Public/Plan.md", "roadmap"),
      makeFile("Private/Plan.md", "roadmap"),
    ]);
    const context = makeContext(["Public"]);
    const node = makeNode("note-search", { query: "Plan", saveTo: "results" });

    await handleNoteSearchNode(node, context, app);

    expect(JSON.parse(String(context.variables.get("results")))).toEqual([
      { name: "Plan", path: "Public/Plan.md" },
    ]);
  });

  it("blocks prompt-file reads outside configured folders", async () => {
    const app = makeApp([makeFile("Private/Secret.md", "secret")]);
    const context = makeContext(["Public"]);
    const node = makeNode("prompt-file", { path: "Private/Secret.md", saveTo: "content" });

    await expect(handlePromptFileNode(node, context, app, {
      promptForFile: async () => "Private/Secret.md",
    })).rejects.toThrow("Access denied");
  });

  it("blocks file-explorer reads outside configured folders", async () => {
    const app = makeApp([makeFile("Private/Secret.md", "secret")]);
    const context = makeContext(["Public"]);
    const node = makeNode("file-explorer", { path: "Private/Secret.md", saveTo: "file" });

    await expect(handleFileExplorerNode(node, context, app)).rejects.toThrow("Access denied");
  });

  it("blocks file-save writes outside configured folders", async () => {
    const app = makeApp([]);
    const context = makeContext(["Public"]);
    context.variables.set("file", JSON.stringify({
      path: "Public/Note.md",
      basename: "Note.md",
      name: "Note",
      extension: "md",
      mimeType: "text/markdown",
      contentType: "text",
      data: "content",
    }));
    const node = makeNode("file-save", { source: "file", path: "Private/Secret.md" });

    await expect(handleFileSaveNode(node, context, app)).rejects.toThrow("Access denied");
  });

  it("blocks prompt-selection reads outside configured folders", async () => {
    const app = makeApp([makeFile("Private/Secret.md", "secret")]);
    const context = makeContext(["Public"]);
    const node = makeNode("prompt-selection", { saveTo: "selection" });

    await expect(handlePromptSelectionNode(node, context, app, {
      promptForSelection: async () => ({
        path: "Private/Secret.md",
        start: { line: 0, ch: 0 },
        end: { line: 0, ch: 6 },
      }),
    })).rejects.toThrow("Access denied");
  });

  it("blocks obsidian-command path access outside configured folders", async () => {
    const app = makeApp([makeFile("Private/Secret.md", "secret")]);
    const context = makeContext(["Public"]);
    const node = makeNode("obsidian-command", {
      command: "editor:save-file",
      path: "Private/Secret.md",
    });

    await expect(handleObsidianCommandNode(node, context, app)).rejects.toThrow("Access denied");
  });

  it("allows obsidian-command path access inside configured folders", async () => {
    let openedPath: string | null = null;
    let executedCommand: string | null = null;
    const app = makeApp([makeFile("Public/Note.md", "content")]) as App & {
      workspace: {
        getLeaf: () => { openFile: (file: TFile) => Promise<void> };
      };
      commands: {
        executeCommandById: (commandId: string) => Promise<void>;
      };
    };
    app.workspace.getLeaf = () => ({
      openFile: async (file: TFile) => {
        openedPath = file.path;
      },
    });
    app.commands.executeCommandById = async (commandId: string) => {
      executedCommand = commandId;
    };
    const context = makeContext(["Public"]);
    const node = makeNode("obsidian-command", {
      command: "editor:save-file",
      path: "Public/Note.md",
    });

    await handleObsidianCommandNode(node, context, app);

    expect(openedPath).toBe("Public/Note.md");
    expect(executedCommand).toBe("editor:save-file");
  });
});
