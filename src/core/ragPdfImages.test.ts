import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, loadPdfJs, TFile } from "obsidian";
import { renderRagImage, renderRagPdfImages } from "./ragPdfImages";

vi.mock("obsidian", async (original) => ({
  ...await original<typeof import("obsidian")>(), loadPdfJs: vi.fn(),
}));

const render = vi.fn();
const cleanup = vi.fn();
const destroy = vi.fn();
const getPage = vi.fn();
const readBinary = vi.fn();
const canvas = { width: 0, height: 0, getContext: vi.fn(), toDataURL: vi.fn() };
const app = { vault: { getAbstractFileByPath: () => new TFile(), readBinary } } as unknown as App;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("createEl", () => canvas);
  readBinary.mockResolvedValue(new ArrayBuffer(4));
  canvas.getContext.mockReturnValue({ fillRect: vi.fn() });
  canvas.toDataURL.mockReturnValue("data:image/jpeg;base64,YWJj");
  render.mockReturnValue({ promise: Promise.resolve() });
  getPage.mockResolvedValue({
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render, cleanup,
  });
  vi.mocked(loadPdfJs).mockResolvedValue({ getDocument: () => ({
    promise: Promise.resolve({ numPages: 20, getPage, destroy }),
  }) });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("renderRagImage", () => {
  it("scales and pads native images into bounded JPEG assets and releases blob/canvas resources", async () => {
    const drawImage = vi.fn();
    canvas.getContext.mockReturnValue({ fillRect: vi.fn(), drawImage });
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.stubGlobal("Image", class {
      naturalWidth = 4_000;
      naturalHeight = 100;
      onload?: () => void;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    });
    expect(await renderRagImage(app, "diagram.webp")).toEqual([{ type: "image", format: "jpg", data_base64: "YWJj" }]);
    expect(drawImage.mock.calls[0].slice(1)).toEqual([0, 0, 1568, 40]);
    expect(revoke).toHaveBeenCalledWith("blob:test");
    expect(canvas.width).toBe(0); expect(canvas.height).toBe(0);
  });

  it("returns no image on decode failures instead of scoring a filename label", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:broken");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("Image", class {
      onerror?: () => void;
      set src(_value: string) { queueMicrotask(() => this.onerror?.()); }
    });
    expect(await renderRagImage(app, "broken.png")).toBeNull();
    expect(revoke).toHaveBeenCalledWith("blob:broken");
  });
});

describe("renderRagPdfImages", () => {
  it("renders only matched pages, meets Jev limits, and releases PDF and canvas resources", async () => {
    const images = await renderRagPdfImages(app, "scan.pdf", 3, 8);
    expect(images).toHaveLength(6);
    expect(images?.[0]).toEqual({ type: "image", format: "jpg", data_base64: "YWJj" });
    expect(getPage.mock.calls.map(([page]) => page)).toEqual([3, 4, 5, 6, 7, 8]);
    for (const [options] of render.mock.calls) {
      expect(options.viewport.width).toBeGreaterThanOrEqual(256);
      expect(options.viewport.height).toBeLessThanOrEqual(1568);
    }
    expect(cleanup).toHaveBeenCalledTimes(6);
    expect(destroy).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
  });

  it.each([[0, 1], [2, 1], [1, 17], [1.5, 2]])("does not render invalid or oversized ranges (%s-%s)", async (start, end) => {
    expect(await renderRagPdfImages(app, "scan.pdf", start, end)).toBeNull();
    expect(readBinary).not.toHaveBeenCalled();
  });

  it("does not silently truncate a range beyond the document", async () => {
    expect(await renderRagPdfImages(app, "scan.pdf", 19, 21)).toBeNull();
    expect(getPage).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("returns no partial images and releases resources when a page fails", async () => {
    render.mockReturnValueOnce({ promise: Promise.resolve() })
      .mockReturnValueOnce({ promise: Promise.reject(new Error("render failed")) });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await renderRagPdfImages(app, "scan.pdf", 1, 3)).toBeNull();
    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(destroy).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("pads narrow pages to the minimum image dimensions", async () => {
    getPage.mockResolvedValue({
      getViewport: ({ scale }: { scale: number }) => ({ width: 10 * scale, height: 800 * scale }),
      render: (options: unknown) => {
        expect(canvas.width).toBe(280);
        expect(canvas.height).toBe(1568);
        return render(options);
      }, cleanup,
    });
    expect(await renderRagPdfImages(app, "scan.pdf", 1, 1)).toHaveLength(1);
  });

  it("keeps PDFs unfiltered when encoded images exceed the request budget", async () => {
    canvas.toDataURL.mockReturnValue(`data:image/jpeg;base64,${"A".repeat(13 * 1024 * 1024)}`);
    expect(await renderRagPdfImages(app, "scan.pdf", 1, 1)).toBeNull();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("reads external indexed PDFs from disk", async () => {
    const readFile = vi.fn().mockResolvedValue(new Uint8Array([1, 2]));
    vi.stubGlobal("window", { require: () => ({ promises: { readFile } }) });
    expect(await renderRagPdfImages(app, "/external/scan.pdf", 1, 1)).toHaveLength(1);
    expect(readFile).toHaveBeenCalledWith("/external/scan.pdf");
    expect(readBinary).not.toHaveBeenCalled();
  });
});
