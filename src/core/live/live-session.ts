import type { ApiProviderConfig } from "src/types";
import type { LiveFileAccess, LiveToolCall } from "./live-tool-definitions";

export type LiveProvider = "gemini" | "openai";
export type LiveState = "idle" | "connecting" | "connected";
export interface LiveTranscript { id: string; role: "user" | "assistant"; text: string }
export interface LiveOptions extends LiveFileAccess {
  model: string; voice: string; instructions: string; language: "ja" | "en";
  inputDeviceId?: string; outputDeviceId?: string;
}
export interface LiveConnectionConfig { apiKey: string; proxyUrl?: string; proxyBypass?: string }
export interface LiveCallbacks {
  audio: HTMLAudioElement;
  onState: (state: LiveState) => void;
  onTranscript: (transcript: LiveTranscript[]) => void;
  onError: (message: string) => void;
  onToolCall?: (call: LiveToolCall, signal: AbortSignal) => Promise<unknown>;
}
export interface LiveSession { start(options: LiveOptions): Promise<void>; stop(): void; mute(muted: boolean): void }

/** Realtime credentials and media are only sent to the selected official provider. */
export function getLiveProvider(config: ApiProviderConfig | null | undefined): LiveProvider | null {
  if (!config?.apiKey.trim()) return null;
  if (config.type !== "gemini" && config.type !== "openai") return null;
  try {
    const url = new URL(config.baseUrl);
    const origin = config.type === "gemini" ? "https://generativelanguage.googleapis.com" : "https://api.openai.com";
    const path = url.pathname.replace(/\/+$/, "");
    return url.origin === origin && !url.username && !url.password && !url.search && !url.hash
      && (path === "" || (config.type === "openai" && path === "/v1")) ? config.type : null;
  } catch { return null; }
}

/** Live has its own provider selection; chat model/catalog flags do not gate it. */
export function getLiveProviders(configs: ApiProviderConfig[]): ApiProviderConfig[] {
  return configs.filter(config => getLiveProvider(config) !== null);
}
