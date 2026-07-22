export function isAbsolutePath(path: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(path) || path.startsWith("/") || path.startsWith("\\\\");
}

export function normalizePathSeparators(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}

/** True if the (already-normalized-or-not) path is absolute, or contains a "." or ".." segment. */
export function isUnsafePath(path: string): boolean {
  const normalized = normalizePathSeparators(path);
  return isAbsolutePath(normalized) || normalized.split("/").some(part => part === "." || part === "..");
}

export function getNodeFs(): typeof import("fs") | null {
  const requireFn = (window as unknown as { require?: NodeJS.Require }).require;
  if (!requireFn) return null;
  try {
    return requireFn("fs") as typeof import("fs");
  } catch {
    return null;
  }
}
