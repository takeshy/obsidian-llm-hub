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
      getMarkdownFiles: () => files.filter((file) => file.extension === "md"),
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

describe("LLM vault tool folder scope", () => {
  it("reads today's Timeline activity through the dedicated AI tool", async () => {
    const app = makeApp([
      makeFile("Dashboards/Timeline/Timeline/2026-07-23.md", "2026-07-23T01:00:00.000Z\nid: memo-1\n\nMemo created"),
      makeFile("Dashboards/Timeline/Timeline/2026-07-30.md", "2026-07-23T02:00:00.000Z\nid: event-1\n\n<!-- calendar-event: 2026-07-30 -->\n> Planned review"),
    ]);

    const result = await executeToolCall(app, "read_timeline", { date: "2026-07-23" });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(String(result.content)).toContain("Memo created");
    expect(String(result.content)).toContain("Planned review");
  });

  it("allows the whole vault when no allowed folders are configured", async () => {
    const app = makeApp([makeFile("Private/Secret.md", "secret")]);

    const result = await executeToolCall(app, "read_note", { fileName: "Private/Secret.md" }, {
      limitVaultToolScope: true,
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
      limitVaultToolScope: true,
      cloudVaultToolAllowedFolders: ["Public"],
    });

    expect(result.success).toBe(false);
    expect(String(result.error)).toContain("Access denied");
  });

  it("blocks an out-of-scope PDF looked up by bare file name", async () => {
    const app = makeApp([
      makeFile("Public/Note.md", "public"),
      makeFile("Private/secret.pdf", ""),
    ]);

    const result = await executeToolCall(app, "read_note", { fileName: "secret.pdf" }, {
      limitVaultToolScope: true,
      cloudVaultToolAllowedFolders: ["Public"],
      pdfInputMode: "native",
    });

    expect(result.success).toBe(false);
    expect(String(result.error)).toContain("Access denied");
  });

  it("validates read_note PDF page arguments", async () => {
    const app = makeApp([makeFile("Public/report.pdf")]);

    const result = await executeToolCall(app, "read_note", {
      fileName: "Public/report.pdf",
      startPage: 1.5,
    });

    expect(result.success).toBe(false);
    expect(String(result.error)).toContain("positive integers");
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
      limitVaultToolScope: true,
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
      limitVaultToolScope: true,
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
      limitVaultToolScope: true,
      cloudVaultToolAllowedFolders: ["Public"],
    });

    expect(result.folders).toEqual(["Public", "Public/Nested"]);
  });

  it("does not restrict callers that do not opt into LLM vault scope", async () => {
    const app = makeApp([makeFile("Private/Secret.md", "secret")]);

    const result = await executeToolCall(app, "read_note", { fileName: "Private/Secret.md" }, {
      limitVaultToolScope: false,
      cloudVaultToolAllowedFolders: ["Public"],
    });

    expect(result.success).toBe(true);
    expect(result.path).toBe("Private/Secret.md");
  });
});

describe("LLM vault tool folder scope edge cases", () => {
  it("denies everything when every configured folder is unusable", async () => {
    // The old private copy of the scope check returned "allowed" once nothing
    // normalized, so a typo like "../notes" opened the whole vault.
    const app = makeApp([makeFile("Private/Secret.md", "secret")]);

    const result = await executeToolCall(app, "read_note", { fileName: "Private/Secret.md" }, {
      limitVaultToolScope: true,
      cloudVaultToolAllowedFolders: ["../escape"],
    });

    expect(result.success).toBe(false);
    expect(String(result.error)).toContain("Access denied");
  });

  it("treats folder names that differ only in case as different folders", async () => {
    const app = makeApp([makeFile("public/Note.md", "other")]);

    const result = await executeToolCall(app, "read_note", { fileName: "public/Note.md" }, {
      limitVaultToolScope: true,
      cloudVaultToolAllowedFolders: ["Public"],
    });

    expect(result.success).toBe(false);
    expect(String(result.error)).toContain("Access denied");
  });

  it("lists the ancestors needed to reach an allowed folder, and nothing beside them", async () => {
    const app = makeApp([]);

    const result = await executeToolCall(app, "list_folders", {}, {
      limitVaultToolScope: true,
      cloudVaultToolAllowedFolders: ["Public/Nested"],
    });

    expect(result.success).toBe(true);
    expect(result.folders).toEqual(["Public", "Public/Nested"]);
  });
});

describe("list_folders under a restricted scope", () => {
  it("answers about an ancestor it is willing to list", async () => {
    // The gate used the strict check while the listing used the navigable one,
    // so the tool listed "Public" and then refused to be asked about it.
    const app = makeApp([]);

    const result = await executeToolCall(app, "list_folders", { parentFolder: "Public" }, {
      limitVaultToolScope: true,
      cloudVaultToolAllowedFolders: ["Public/Nested"],
    });

    expect(result.success).toBe(true);
    expect(result.folders).toEqual(["Public/Nested"]);
  });

  it("still refuses a folder that leads nowhere allowed", async () => {
    const app = makeApp([]);

    const result = await executeToolCall(app, "list_folders", { parentFolder: "Private" }, {
      limitVaultToolScope: true,
      cloudVaultToolAllowedFolders: ["Public/Nested"],
    });

    expect(result.success).toBe(false);
    expect(String(result.error)).toContain("Access denied");
  });
});
