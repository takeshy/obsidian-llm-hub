import { describe, expect, it } from "vitest";
import { App, TFile, TFolder } from "obsidian";
import { executeToolCall } from "./toolExecutor";

function makeFile(path: string, content = ""): TFile {
  const file = new TFile();
  const name = path.split("/").pop() ?? path;
  const lastDot = name.lastIndexOf(".");
  file.path = path;
  file.name = name;
  file.basename = lastDot > 0 ? name.slice(0, lastDot) : name;
  file.extension = lastDot > 0 ? name.slice(lastDot + 1) : "";
  (file as TFile & { stat: { mtime: number } }).stat = { mtime: 1 };
  (file as TFile & { _content: string })._content = content;
  return file;
}

function makeApp(files: TFile[], activeFile: TFile | null = null): App {
  const folders = [
    makeFolder("Public"),
    makeFolder("Private"),
    makeFolder("Public/Nested"),
  ];
  return {
    vault: {
      getFiles: () => files,
      getAllLoadedFiles: () => [...folders, ...files],
      getAbstractFileByPath: (path: string) => files.find((file) => file.path === path) ?? null,
      read: async (file: TFile) => (file as TFile & { _content: string })._content,
      cachedRead: async (file: TFile) => (file as TFile & { _content: string })._content,
    },
    workspace: {
      getActiveFile: () => activeFile,
    },
  } as unknown as App;
}

function makeFolder(path: string): TFolder {
  const folder = new TFolder();
  folder.path = path;
  folder.name = path.split("/").pop() ?? path;
  return folder;
}

describe("cloud vault tool folder scope", () => {
  it("allows the whole vault when no allowed folders are configured", async () => {
    const app = makeApp([makeFile("Private/Secret.md", "secret")]);

    const result = await executeToolCall(app, "read_note", { fileName: "Private/Secret.md" }, {
      isCloudProvider: true,
      cloudVaultToolAllowedFolders: [],
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe("Private/Secret.md");
  });

  it("blocks direct cloud note reads outside configured folders", async () => {
    const app = makeApp([
      makeFile("Public/Note.md", "public"),
      makeFile("Private/Secret.md", "secret"),
    ]);

    const result = await executeToolCall(app, "read_note", { fileName: "Private/Secret.md" }, {
      isCloudProvider: true,
      cloudVaultToolAllowedFolders: ["Public"],
    });

    expect(result.success).toBe(false);
    expect(String(result.error)).toContain("Access denied");
  });

  it("blocks traversal paths that would escape configured folders", async () => {
    const app = makeApp([
      makeFile("Public/Note.md", "public"),
      makeFile("Private/Secret.md", "secret"),
    ]);

    const result = await executeToolCall(app, "create_note", {
      name: "../Private/Secret.md",
      folder: "Public",
      content: "leak",
    }, {
      isCloudProvider: true,
      cloudVaultToolAllowedFolders: ["Public"],
    });

    expect(result.success).toBe(false);
    expect(String(result.error)).toContain("Access denied");
  });

  it("filters cloud search and list results to configured folders", async () => {
    const app = makeApp([
      makeFile("Public/Plan.md", "shared roadmap"),
      makeFile("Private/Plan.md", "private roadmap"),
      makeFile("Private/Other.md", "other"),
    ]);
    const context = {
      isCloudProvider: true,
      cloudVaultToolAllowedFolders: ["Public"],
    };

    const searchResult = await executeToolCall(app, "search_notes", { query: "Plan" }, context);
    const listResult = await executeToolCall(app, "list_notes", {}, context);

    expect(searchResult.results).toEqual([{ name: "Plan", path: "Public/Plan.md" }]);
    expect(listResult.notes).toEqual([{ name: "Plan", path: "Public/Plan.md" }]);
  });

  it("filters folder listing to configured folders", async () => {
    const app = makeApp([]);

    const result = await executeToolCall(app, "list_folders", {}, {
      isCloudProvider: true,
      cloudVaultToolAllowedFolders: ["Public"],
    });

    expect(result.folders).toEqual(["Public", "Public/Nested"]);
  });

  it("does not restrict local provider vault tools", async () => {
    const app = makeApp([makeFile("Private/Secret.md", "secret")]);

    const result = await executeToolCall(app, "read_note", { fileName: "Private/Secret.md" }, {
      isCloudProvider: false,
      cloudVaultToolAllowedFolders: ["Public"],
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe("Private/Secret.md");
  });
});
