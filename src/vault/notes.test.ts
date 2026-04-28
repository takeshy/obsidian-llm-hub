import { describe, expect, it } from "vitest";
import { App, TFile } from "obsidian";
import { findFileByName } from "./notes";

function makeFile(path: string): TFile {
  const file = new TFile();
  const name = path.split("/").pop() ?? path;
  const lastDot = name.lastIndexOf(".");
  file.path = path;
  file.name = name;
  file.basename = lastDot > 0 ? name.slice(0, lastDot) : name;
  file.extension = lastDot > 0 ? name.slice(lastDot + 1) : "";
  return file;
}

function makeApp(files: TFile[]): App {
  return {
    vault: {
      getFiles: () => files,
    },
  } as unknown as App;
}

describe("findFileByName", () => {
  it("prefers markdown when the lookup omits an extension", () => {
    const app = makeApp([
      makeFile("Plan.canvas"),
      makeFile("Plan.md"),
    ]);

    expect(findFileByName(app, "Plan")?.path).toBe("Plan.md");
  });

  it("resolves explicit non-markdown extensions", () => {
    const app = makeApp([
      makeFile("Plan.md"),
      makeFile("Plan.canvas"),
    ]);

    expect(findFileByName(app, "Plan.canvas")?.path).toBe("Plan.canvas");
  });
});
