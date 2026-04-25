/**
 * OpenCode Local Server Provider
 *
 * Connects to an OpenCode local server (`opencode serve` or the OpenCode
 * Desktop/Windows app server). The OpenCode server has its own HTTP/OpenAPI
 * surface that does not match the OpenAI-compatible
 * `/v1/models` + `/v1/chat/completions` shape used by Ollama / LM Studio /
 * vLLM, so it needs a dedicated client.
 *
 * Endpoints (per the documented OpenCode HTTP API):
 *   GET  /global/health       health probe
 *   GET  /config/providers    list of providers and their models
 *   POST /session             create a new session
 *   POST /session/:id/message send a message and receive the assistant reply
 *   GET  /global/event        server-sent events stream (used for streaming)
 *
 * Models are addressed as "<providerID>/<modelID>" in the UI so a single
 * dropdown can hold every provider+model combination the server exposes.
 *
 * Auth:
 * - Optional Bearer token (LocalLlmConfig.apiKey)
 * - Optional HTTP Basic Auth (LocalLlmConfig.username / .password) matching
 *   the OPENCODE_SERVER_USERNAME / OPENCODE_SERVER_PASSWORD env vars.
 *
 * Streaming: subscribes to `GET /global/event` before posting the message and
 * emits `text` chunks as `message.part.updated` events arrive for the
 * assistant reply. The POST response is still awaited as a completion signal
 * and as a fallback source of text when SSE is unavailable.
 */

import { requestUrl } from "obsidian";
import type { Message, StreamChunk, LocalLlmConfig, Attachment } from "../types";
import { getHttpModule, StreamSignal, STREAM_IDLE_TIMEOUT_MS } from "./localLlmProvider";

interface OpenCodeProviderInfo {
  id?: string;
  providerID?: string;
  name?: string;
  models?: Record<string, { id?: string; name?: string } | string> | Array<{ id?: string; modelID?: string; name?: string } | string>;
}

interface OpenCodeProvidersResponse {
  providers?: OpenCodeProviderInfo[];
  data?: OpenCodeProviderInfo[];
}

interface OpenCodeSessionResponse {
  id?: string;
  sessionID?: string;
  session?: { id?: string };
}

interface OpenCodeMessagePart {
  id?: string;
  type?: string;
  text?: string;
  content?: string;
}

/**
 * `POST /session/:id/message` returns `{ info: Message, parts: Part[] }`.
 * Other field shapes are accepted as best-effort fallbacks for older builds
 * or divergent SDKs.
 */
interface OpenCodeMessageResponse {
  info?: { parts?: OpenCodeMessagePart[]; content?: string | OpenCodeMessagePart[] };
  message?: { parts?: OpenCodeMessagePart[]; content?: string | OpenCodeMessagePart[] };
  parts?: OpenCodeMessagePart[];
  content?: string | OpenCodeMessagePart[];
  output?: string;
  text?: string;
  reply?: { parts?: OpenCodeMessagePart[]; content?: string };
}

// btoa() only accepts Latin-1; encode UTF-8 first so non-ASCII credentials
// (e.g. Japanese passwords) don't throw "InvalidCharacterError" at request time.
function base64EncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function buildHeaders(config: LocalLlmConfig): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  } else if (config.username || config.password) {
    // OPENCODE_SERVER_USERNAME defaults to "opencode" when only the password
    // env is set, so mirror that here when the user leaves Username blank.
    const username = config.username && config.username.length > 0
      ? config.username
      : "opencode";
    const token = base64EncodeUtf8(`${username}:${config.password ?? ""}`);
    headers["Authorization"] = `Basic ${token}`;
  }
  return headers;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function extractModelIds(providers: OpenCodeProviderInfo[]): string[] {
  const out: string[] = [];
  for (const p of providers) {
    const providerId = p.providerID ?? p.id ?? p.name;
    if (!providerId) continue;
    // The dropdown identifier is "<providerID>/<modelID>" and the chat path
    // splits on the FIRST slash. A providerID containing "/" would make that
    // round-trip ambiguous, so refuse it. Same for modelIDs — current
    // OpenCode providers don't expose slash-prefixed model names, but if one
    // ever appears we'd silently misroute it.
    if (providerId.includes("/")) continue;
    const models = p.models;
    if (!models) continue;

    const push = (modelId: string | undefined): void => {
      if (!modelId || modelId.includes("/")) return;
      out.push(`${providerId}/${modelId}`);
    };

    if (Array.isArray(models)) {
      for (const m of models) {
        push(typeof m === "string" ? m : (m.modelID ?? m.id ?? m.name));
      }
    } else {
      for (const [key, val] of Object.entries(models)) {
        push(typeof val === "string" ? key : (val.id ?? val.name ?? key));
      }
    }
  }
  return out;
}

/**
 * Verify connection to an OpenCode local server and list available models.
 *
 * Tries `/app` first (current OpenCode), then `/global/health` (older builds).
 * Models are loaded from `/config/providers` (with `/provider` as fallback).
 */
export async function verifyOpencodeLocal(config: LocalLlmConfig): Promise<{
  success: boolean;
  error?: string;
  models?: string[];
}> {
  const base = trimTrailingSlash(config.baseUrl);
  const headers = buildHeaders(config);

  // Health probe
  let healthOk = false;
  for (const path of ["/app", "/global/health", "/health"]) {
    try {
      const res = await requestUrl({ url: `${base}${path}`, method: "GET", headers, throw: false });
      if (res.status >= 200 && res.status < 300) {
        healthOk = true;
        break;
      }
    } catch {
      // try next
    }
  }
  if (!healthOk) {
    return { success: false, error: `Cannot reach OpenCode server at ${base}. Is "opencode serve" running?` };
  }

  // Fetch providers + models
  for (const path of ["/config/providers", "/provider"]) {
    try {
      const res = await requestUrl({ url: `${base}${path}`, method: "GET", headers, throw: false });
      if (res.status < 200 || res.status >= 300) continue;
      const data = res.json as OpenCodeProvidersResponse | OpenCodeProviderInfo[];
      const providers = Array.isArray(data)
        ? data
        : (data.providers ?? data.data ?? []);
      const models = extractModelIds(providers);
      if (models.length > 0) {
        return { success: true, models };
      }
    } catch {
      // try next
    }
  }

  return { success: false, error: "Connected to OpenCode server but could not list providers/models." };
}

/**
 * Convert plugin Message[] into a single user prompt for the OpenCode session.
 *
 * OpenCode sessions track conversation state server-side, but this client is
 * stateless on each call, so we serialize prior turns into the prompt. Every
 * message (including the last one) is tagged with its role so that a history
 * ending with an assistant turn — e.g. a regenerate or retry — stays
 * well-formed.
 */
function flattenConversation(systemPrompt: string, messages: Message[]): string {
  const lines: string[] = [];
  if (systemPrompt) lines.push(`[system]\n${systemPrompt}\n`);
  for (const msg of messages) {
    const role = msg.role === "user" ? "user" : "assistant";
    lines.push(`[${role}]\n${msg.llmContent ?? msg.content}\n`);
  }
  return lines.join("\n");
}

function extractText(reply: OpenCodeMessageResponse): string {
  // `parts` may live at top level (current `POST /session/:id/message`
  // response), or be nested under `info` / `message` / `reply` for older or
  // wrapped responses. Check each in turn.
  const partsHolder = reply.parts
    ? reply
    : (reply.info ?? reply.message ?? reply.reply ?? reply);
  const parts = partsHolder.parts;
  if (Array.isArray(parts)) {
    return parts
      .filter(p => !p.type || p.type === "text")
      .map(p => p.text ?? p.content ?? "")
      .filter(Boolean)
      .join("");
  }
  if (typeof partsHolder.content === "string") {
    return partsHolder.content;
  }
  if (Array.isArray(partsHolder.content)) {
    return partsHolder.content
      .filter(p => !p.type || p.type === "text")
      .map(p => p.text ?? p.content ?? "")
      .filter(Boolean)
      .join("");
  }
  if (typeof reply.output === "string") return reply.output;
  if (typeof reply.text === "string") return reply.text;
  return "";
}

/**
 * OpenCode `/global/event` payload shapes we consume. The server emits many
 * other event types we ignore.
 *
 * Text flows through two event kinds:
 * - `message.part.delta` — per-token increments (`field: "text", delta: ...`)
 * - `message.part.updated` — periodic cumulative snapshots of a part
 *
 * Both include the `messageID` / `part.messageID` so we can distinguish
 * the assistant's reply from the user's echo of the prompt.
 */
interface OpenCodeSseEvent {
  payload?: {
    type?: string;
    properties?: {
      sessionID?: string;
      // message.part.updated
      part?: {
        id?: string;
        type?: string;
        text?: string;
        messageID?: string;
      };
      // message.updated
      info?: {
        id?: string;
        role?: string;
        finish?: string;
        error?: unknown;
      };
      // message.part.delta
      messageID?: string;
      partID?: string;
      field?: string;
      delta?: string;
      // session.status
      status?: { type?: string };
    };
  };
}

/**
 * Send a chat turn to an OpenCode local server with streaming.
 *
 * Flow:
 *   1. Create a fresh session via POST /session.
 *   2. Open a Node-level HTTP GET on /global/event to receive SSE updates.
 *   3. POST /session/:id/message to kick off generation.
 *   4. For each `message.part.updated` with `part.type === "text"` on our
 *      session, compute the delta against what we have already emitted for
 *      that partID and yield it as a `text` chunk.
 *   5. When the POST resolves, emit `done` and close the SSE connection.
 *      If no text chunks were emitted via SSE (e.g. event stream blocked),
 *      fall back to extracting text from the POST response body.
 *
 * The `model` field on `config` is expected to be `<providerID>/<modelID>`,
 * matching the format returned by `verifyOpencodeLocal`.
 */
export async function* opencodeLocalChatStream(
  config: LocalLlmConfig,
  messages: Message[],
  systemPrompt: string,
  signal?: AbortSignal,
  _attachments?: Attachment[],
): AsyncGenerator<StreamChunk> {
  void _attachments; // attachments not yet forwarded; see issue #37 for follow-ups

  const base = trimTrailingSlash(config.baseUrl);
  const headers = buildHeaders(config);

  // Split on the FIRST "/": providerID never contains slashes in
  // `/config/providers`, but modelIDs can (e.g. "openrouter/anthropic/..."
  // style). Splitting on the first slash keeps the providerID short and the
  // rest of the string — slashes and all — as the modelID.
  const slash = config.model.indexOf("/");
  if (slash <= 0 || slash === config.model.length - 1) {
    yield { type: "error", error: `OpenCode model must be "<providerID>/<modelID>" (got "${config.model}")` };
    return;
  }
  const providerID = config.model.slice(0, slash);
  const modelID = config.model.slice(slash + 1);

  if (signal?.aborted) return;

  // 1) Create session
  let sessionId: string;
  try {
    const res = await requestUrl({
      url: `${base}/session`,
      method: "POST",
      headers,
      body: JSON.stringify({}),
      throw: false,
    });
    if (res.status < 200 || res.status >= 300) {
      yield { type: "error", error: `Failed to create OpenCode session: HTTP ${res.status}` };
      return;
    }
    const data = res.json as OpenCodeSessionResponse;
    sessionId = data.id ?? data.sessionID ?? data.session?.id ?? "";
    if (!sessionId) {
      yield { type: "error", error: "OpenCode server did not return a session id" };
      return;
    }
  } catch (err) {
    yield { type: "error", error: `OpenCode session error: ${err instanceof Error ? err.message : String(err)}` };
    return;
  }

  if (signal?.aborted) return;

  // 2) Open SSE connection before posting the message so we don't miss any
  //    events emitted during generation.
  const eventUrl = new URL(`${base}/global/event`);
  const httpModule = getHttpModule(eventUrl.protocol);

  const chunks: StreamChunk[] = [];
  const signal$ = new StreamSignal();
  let streamDone = false;
  let streamError: Error | null = null;
  let sseEmittedText = false;

  // The POST creates both a user message (echoing our prompt) and an
  // assistant message. Both fire `message.part.updated` events with
  // `type: "text"` — the user one echoes our prompt back. Track the
  // assistant's message id so we only stream the reply, not our own input.
  let assistantMessageId: string | undefined;
  // Cumulative text emitted per partID so repeated events only yield the
  // new suffix. Stored as strings (not lengths) so we can detect snapshots
  // that don't align with our prefix and reset cleanly.
  const emittedText = new Map<string, string>();
  // partID → part type (e.g. "text", "reasoning", "step-start").
  // Needed because `message.part.delta` events carry `field: "text"` for
  // both reasoning-part deltas and text-part deltas; only the part's
  // declared type tells us which is the user-visible reply.
  const partTypeById = new Map<string, string>();

  const emitDelta = (partID: string, delta: string) => {
    if (!delta) return;
    chunks.push({ type: "text", content: delta });
    emittedText.set(partID, (emittedText.get(partID) ?? "") + delta);
    sseEmittedText = true;
  };

  // Emit text from the POST response body, deduplicating against anything SSE
  // has already delivered. When parts have ids, route them through the same
  // delta map so a late SSE update for the same part computes a zero-length
  // diff. When parts have no ids (older / divergent server shapes), fall
  // back to the legacy "only emit if SSE was silent" rule.
  const emitFromPostBody = (reply: OpenCodeMessageResponse): void => {
    const partsHolder = reply.parts
      ? reply
      : (reply.info ?? reply.message ?? reply.reply ?? reply);
    const parts = partsHolder.parts;
    if (Array.isArray(parts)) {
      for (const p of parts) {
        if (p.type !== undefined && p.type !== "text") continue;
        const text = p.text ?? (typeof p.content === "string" ? p.content : "");
        if (!text) continue;
        if (typeof p.id === "string") {
          const prev = emittedText.get(p.id) ?? "";
          if (text.length > prev.length && text.startsWith(prev)) {
            emitDelta(p.id, text.slice(prev.length));
          }
          // Snapshot diverges or is shorter: prefer what SSE already streamed.
        } else if (!sseEmittedText) {
          chunks.push({ type: "text", content: text });
          sseEmittedText = true;
        }
      }
      return;
    }
    if (!sseEmittedText) {
      const text = extractText(reply);
      if (text) chunks.push({ type: "text", content: text });
    }
  };

  const handleEvent = (evt: OpenCodeSseEvent): void => {
    const payload = evt.payload;
    if (!payload || !payload.type) return;
    const props = payload.properties;
    if (!props) return;
    // Filter by our session so events from concurrent sessions don't leak in.
    if (props.sessionID && props.sessionID !== sessionId) return;

    if (payload.type === "message.updated") {
      const info = props.info;
      if (info?.role === "assistant") {
        if (info.id && !assistantMessageId) assistantMessageId = info.id;
        if (info.error) {
          // Surface as an error chunk but don't tear down the stream — the
          // POST response may still resolve with a usable reply, and
          // terminating here would drop it. The pump loop forwards the error
          // chunk to the caller in order with any subsequent text.
          chunks.push({ type: "error", error: `OpenCode reported an error: ${JSON.stringify(info.error).slice(0, 200)}` });
        }
      }
      return;
    }

    // `message.part.updated` always carries the part's declared type, so
    // capture that mapping even before we know the assistant's messageID.
    // This keeps us from racing with the first delta on the text part.
    if (payload.type === "message.part.updated") {
      const part = props.part;
      if (part?.id && part.type) partTypeById.set(part.id, part.type);
    }

    // Only consume text destined for the assistant's message. Without an
    // assistant id yet, we'd be at risk of emitting the user prompt echo.
    if (!assistantMessageId) return;

    if (payload.type === "message.part.delta") {
      if (props.field !== "text") return;
      if (typeof props.delta !== "string" || !props.partID) return;
      if (props.messageID && props.messageID !== assistantMessageId) return;
      // Reasoning deltas also use `field: "text"`; the part's declared type
      // is the only way to distinguish them from user-visible text.
      if (partTypeById.get(props.partID) !== "text") return;
      emitDelta(props.partID, props.delta);
    } else if (payload.type === "message.part.updated") {
      const part = props.part;
      if (part?.type !== "text") return;
      if (typeof part.text !== "string" || !part.id) return;
      if (part.messageID && part.messageID !== assistantMessageId) return;
      const prev = emittedText.get(part.id) ?? "";
      if (part.text.length > prev.length && part.text.startsWith(prev)) {
        emitDelta(part.id, part.text.slice(prev.length));
      } else if (part.text.length > prev.length) {
        // Snapshot diverges from our prefix (rare — duplicate delivery of an
        // edited part). Reset to the server's view so we don't drift.
        chunks.push({ type: "text", content: part.text });
        emittedText.set(part.id, part.text);
        sseEmittedText = true;
      }
    }
  };

  const sseReq = httpModule.request(
    {
      hostname: eventUrl.hostname,
      port: eventUrl.port || (eventUrl.protocol === "https:" ? 443 : 80),
      path: eventUrl.pathname + eventUrl.search,
      method: "GET",
      headers: { ...headers, "Accept": "text/event-stream" },
    },
    (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        // SSE failed to open; don't abort — the POST response fallback will
        // still deliver the final text.
        res.resume();
        return;
      }
      let buffer = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            handleEvent(JSON.parse(data) as OpenCodeSseEvent);
          } catch {
            // Ignore malformed lines / heartbeats.
          }
        }
        signal$.notify();
      });
      res.on("end", () => { signal$.notify(); });
      res.on("error", (err: Error) => { streamError = err; signal$.notify(); });
    },
  );
  sseReq.on("error", (_err: Error) => {
    // SSE connection failure is non-fatal: POST response fallback still runs.
    signal$.notify();
  });

  const onAbort = () => {
    sseReq.destroy();
    streamDone = true;
    signal$.notify();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  sseReq.end();

  // 3) POST the message — runs concurrently with SSE reads. We kick this off
  //    without `await` so the SSE loop can start yielding chunks immediately.
  const prompt = flattenConversation(systemPrompt, messages);
  // Body shape: `model` must be a nested `{ providerID, modelID }` object —
  // a flat top-level `providerID/modelID` is silently ignored by the server,
  // which then falls back to its own default model.
  const postBody = JSON.stringify({
    model: { providerID, modelID },
    parts: [{ type: "text", text: prompt }],
  });
  const postPromise = requestUrl({
    url: `${base}/session/${encodeURIComponent(sessionId)}/message`,
    method: "POST",
    headers,
    body: postBody,
    throw: false,
  });

  postPromise
    .then((res) => {
      if (res.status < 200 || res.status >= 300) {
        const detail = (res.text || "").slice(0, 200);
        chunks.push({ type: "error", error: `OpenCode message error: HTTP ${res.status}${detail ? ` ${detail}` : ""}` });
      } else {
        // The POST body is another snapshot of the same assistant message that
        // the SSE stream is delivering. Push it through the same per-partID
        // delta logic so a late `message.part.updated` event arriving after
        // POST resolves doesn't double-emit text already covered by the body.
        emitFromPostBody(res.json as OpenCodeMessageResponse);
      }
      chunks.push({ type: "done" });
      streamDone = true;
      sseReq.destroy();
      signal$.notify();
    })
    .catch((err: unknown) => {
      chunks.push({ type: "error", error: `OpenCode request failed: ${err instanceof Error ? err.message : String(err)}` });
      streamDone = true;
      sseReq.destroy();
      signal$.notify();
    });

  // 4) Pump chunks to the caller.
  try {
    while (!streamDone || chunks.length > 0) {
      if (chunks.length > 0) {
        yield chunks.shift()!;
        continue;
      }
      // TS narrows `streamError` to `null` because it doesn't track closure
      // mutations through flow analysis; cast back to the declared type.
      const err = streamError as Error | null;
      if (err !== null) {
        yield { type: "error", error: `Connection failed: ${err.message}` };
        return;
      }
      if (streamDone) break;
      if (signal?.aborted) return;
      const ok = await signal$.wait(STREAM_IDLE_TIMEOUT_MS);
      if (!ok) {
        yield { type: "error", error: "Stream timed out: no data received for 2 minutes" };
        sseReq.destroy();
        return;
      }
    }
  } finally {
    sseReq.destroy();
    signal?.removeEventListener("abort", onAbort);
  }
}
