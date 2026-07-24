// Obsidian runs plugins in a browser/Electron window. Vitest's Node environment
// exposes the same timer and require shims on the global object, so alias it as
// window to exercise the production code under the same API shape.
const testGlobal = globalThis as typeof globalThis & { window?: typeof globalThis };
Object.defineProperty(testGlobal, "window", {
  value: testGlobal,
  configurable: true,
  writable: true,
});
