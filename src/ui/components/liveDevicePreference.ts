import type { App } from "obsidian";

export type LiveDeviceKind = "input" | "output";

const LIVE_DEVICE_KEYS: Record<LiveDeviceKind, string> = {
  input: "llm-hub-live-input-device",
  output: "llm-hub-live-output-device",
};

/** Selected audio device per vault; an empty string means the system default. */
export function getLiveDevicePreference(app: App, kind: LiveDeviceKind): string {
  const saved: unknown = app.loadLocalStorage(LIVE_DEVICE_KEYS[kind]);
  return typeof saved === "string" ? saved : "";
}

export function setLiveDevicePreference(app: App, kind: LiveDeviceKind, deviceId: string): void {
  app.saveLocalStorage(LIVE_DEVICE_KEYS[kind], deviceId);
}
