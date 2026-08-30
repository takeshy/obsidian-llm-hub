import { describe, expect, it } from "vitest";
import { App, TFile } from "obsidian";
import { listNotes } from "./search";

function makeFile(path: string, mtime = 0): TFile {
  const file = new TFile();
  const name = path.split("/").pop() ?? path;
  const lastDot = name.lastIndexOf(".");
  file.path = path;
  file.name = name;
  file.basename = lastDot > 0 ? name.slice(0, lastDot) : name;
  file.extension = lastDot > 0 ? name.slice(lastDot + 1) : "";
  file.stat = { size: 10, mtime, ctime: 0 };
  file.parent = { path: path.substring(0, path.lastIndexOf("/")) } as TFile["parent"];
  return file;
}

function makeApp(files: TFile[]): App {
  return { vault: { getFiles: () => files } } as unknown as App;
}

describe("listNotes", () => {
  it("lists PDFs alongside text files so search hits can be listed too", () => {
    const app = makeApp([
      makeFile("Docs/note.md", 2),
      makeFile("Docs/report.pdf", 1),
      makeFile("Docs/photo.png", 3),
    ]);

    const { results } = listNotes(app, "Docs");

    expect(results.map(result => result.path)).toEqual(["Docs/note.md", "Docs/report.pdf"]);
  });
});
