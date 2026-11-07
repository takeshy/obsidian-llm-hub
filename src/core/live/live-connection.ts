import { createNodeFetch, createProxyFetch } from "../proxyFetch";
import type { LiveConnectionConfig, LiveOptions } from "./live-session";
import { geminiLiveSetup } from "./gemini-live-config";
import { openAILiveTools } from "./live-tool-definitions";

function liveFetch(connection: LiveConnectionConfig): typeof fetch {
  return connection.proxyUrl
    ? createProxyFetch(connection.proxyUrl, connection.proxyBypass)
    : createNodeFetch();
}

async function checked(response: Response, secrets: string[]): Promise<Response> {
  if (response.ok) return response;
  let detail = await response.text().catch(() => "");
  for (const secret of secrets) if (secret) detail = detail.split(secret).join("[redacted]");
  throw new Error(`Live HTTP ${response.status}: ${detail.slice(0, 1000)}`);
}

export async function createGeminiLiveToken(options: LiveOptions, connection: LiveConnectionConfig, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  const response = await checked(await liveFetch(connection)("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": connection.apiKey },
    body: JSON.stringify({
      uses: 1, expireTime: new Date(Date.now() + 30 * 60_000).toISOString(),
      newSessionExpireTime: new Date(Date.now() + 60_000).toISOString(),
      bidiGenerateContentSetup: geminiLiveSetup(options),
    }), signal,
  }), [connection.apiKey]);
  const body = await response.json() as { name?: unknown };
  signal.throwIfAborted();
  if (typeof body.name !== "string" || !/^auth_tokens\/\S{1,8000}$/.test(body.name)) throw new Error("Invalid Gemini Live token");
  return body.name;
}

export function openAILiveConfig(options: LiveOptions) {
  return {
    type: "realtime", model: options.model, instructions: options.instructions,
    tools: openAILiveTools(options),
    audio: {
      input: { transcription: { model: "gpt-4o-mini-transcribe", language: options.language }, turn_detection: { type: "server_vad", create_response: true, interrupt_response: true } },
      output: { voice: options.voice },
    },
  };
}

export async function createOpenAILiveAnswer(options: LiveOptions, sdp: string, connection: LiveConnectionConfig, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  const request = liveFetch(connection);
  const tokenResponse = await checked(await request("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${connection.apiKey}` },
    body: JSON.stringify({ expires_after: { anchor: "created_at", seconds: 60 }, session: openAILiveConfig(options) }), signal,
  }), [connection.apiKey]);
  const body = await tokenResponse.json() as { value?: unknown };
  signal.throwIfAborted();
  if (typeof body.value !== "string" || !body.value.startsWith("ek_")) throw new Error("Invalid OpenAI Live token");
  const response = await checked(await request("https://api.openai.com/v1/realtime/calls", {
    method: "POST", headers: { "Content-Type": "application/sdp", Authorization: `Bearer ${body.value}` }, body: sdp, signal,
  }), [connection.apiKey, body.value]);
  signal.throwIfAborted();
  return response.text();
}
