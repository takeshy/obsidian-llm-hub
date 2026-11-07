import assert from "node:assert/strict";
import { test, vi, afterEach } from "vitest";
afterEach(() => vi.restoreAllMocks());
import { OpenAILiveSession, type LiveState, type LiveTranscript } from "./openai-live";
import type { LiveCallbacks } from "./live-session";

const { createAnswer } = vi.hoisted(() => ({ createAnswer: vi.fn() }));
vi.mock("./live-connection", () => ({ createOpenAILiveAnswer: createAnswer }));

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
function fixture(t: import("vitest").TestContext, mic?: Promise<unknown>, onToolCall?: LiveCallbacks["onToolCall"]) {
  let stopped = 0;
  const track = { enabled: true, stop() { stopped++; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const audio = { pause() {}, play: async () => {}, srcObject: null };
  const states: LiveState[] = [];
  const errors: string[] = [];
  let transcript: LiveTranscript[] = [];
  const sent: unknown[] = [];
  const channel = { send: (raw: string) => sent.push(JSON.parse(raw)), onopen: null as (() => void) | null, onmessage: null as ((event: { data: string }) => void) | null, onclose: null as (() => void) | null, onerror: null, close() {} };
  let peerClosed = false;
  const peer = {
    connectionState: "new", onconnectionstatechange: null as (() => void) | null, ontrack: null,
    addTrack() {}, createDataChannel: () => channel,
    createOffer: async () => ({ sdp: "offer", type: "offer" }), setLocalDescription: async () => {},
    setRemoteDescription: async () => { channel.onopen?.(); }, close() { peerClosed = true; },
  };
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: { getUserMedia: async () => mic ? mic : stream } } });
  t.onTestFinished(() => { if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor); });
  const globals = globalThis as unknown as Record<string, unknown>;
  const previousPeer = globals.RTCPeerConnection;
  globals.RTCPeerConnection = function () { return peer; };
  t.onTestFinished(() => { globals.RTCPeerConnection = previousPeer; });
  createAnswer.mockResolvedValue("answer");
  const session = new OpenAILiveSession({ audio: audio as unknown as HTMLAudioElement, onState: (state) => states.push(state), onToolCall, onError: (error) => errors.push(error), onTranscript: (items) => { transcript = items; } }, { apiKey: "test-key" });
  t.onTestFinished(() => session.stop());
  return { session, track, stream, states, errors, channel, peer, sent, get stopped() { return stopped; }, get peerClosed() { return peerClosed; }, get transcript() { return transcript; } };
}
const options = { model: "gpt-realtime-2.1", voice: "marin", language: "ja" as const, instructions: "Converse" };

test("Live establishes a voice connection, supports mute, and releases all resources on stop", async (t) => {
  const f = fixture(t);
  await f.session.start(options);
  assert.equal(f.states.at(-1), "connected");
  f.session.mute(true); assert.equal(f.track.enabled, false);
  f.session.mute(false); assert.equal(f.track.enabled, true);
  f.session.stop();
  assert.equal(f.stopped, 1); assert.equal(f.peerClosed, true);
  assert.equal(f.states.at(-1), "idle");
});

test("cancelling while microphone permission is pending stops late tracks without opening a connection", async (t) => {
  const mic = deferred<unknown>();
  const f = fixture(t, mic.promise);
  const starting = f.session.start(options);
  f.session.stop();
  mic.resolve(f.stream);
  await starting;
  assert.equal(f.stopped, 1); assert.equal(f.peerClosed, false);
  assert.equal(f.states.at(-1), "idle");
});

test("failed SDP handshake releases microphone and reports provider error", async (t) => {
  const f = fixture(t);
  createAnswer.mockRejectedValue(new Error("Key locked"));
  await f.session.start(options);
  assert.equal(f.stopped, 1); assert.equal(f.peerClosed, true);
  assert.equal(f.errors[0], "Key locked");
});

test("Live preserves turn ordering when user transcription arrives after the assistant response", async (t) => {
  const f = fixture(t);
  await f.session.start(options);
  for (const event of [
    { type: "input_audio_buffer.speech_started", item_id: "u1" },
    { type: "response.output_audio_transcript.delta", item_id: "a1", delta: "こんにちは" },
    { type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: "やあ" },
    { type: "response.output_audio_transcript.done", item_id: "a1", transcript: "こんにちは！" },
  ]) f.channel.onmessage?.({ data: JSON.stringify(event) });
  assert.deepEqual(f.transcript.map(({ role, text }) => ({ role, text })), [{ role: "user", text: "やあ" }, { role: "assistant", text: "こんにちは！" }]);
});

test("fatal realtime events release the microphone", async (t) => {
  const f = fixture(t);
  await f.session.start(options);
  f.channel.onmessage?.({ data: JSON.stringify({ type: "error", error: { message: "Quota exceeded" } }) });
  assert.equal(f.stopped, 1); assert.equal(f.errors[0], "Quota exceeded");
  assert.equal(f.states.at(-1), "idle");
});

test("disconnecting a peer releases the microphone without silently reconnecting", async (t) => {
  const f = fixture(t);
  await f.session.start(options);
  f.peer.connectionState = "disconnected";
  f.peer.onconnectionstatechange?.();
  assert.equal(f.stopped, 1); assert.equal(f.peerClosed, true);
  assert.match(f.errors[0], /connection ended/);
});

test("cancelling an in-flight SDP exchange ignores a late answer", async (t) => {
  const f = fixture(t);
  const answer = deferred<string>();
  const requested = deferred<void>();
  createAnswer.mockImplementation(async () => { requested.resolve(); return answer.promise; });
  const starting = f.session.start(options);
  await requested.promise;
  f.session.stop();
  answer.resolve("late-answer");
  await starting;
  assert.equal(f.stopped, 1); assert.equal(f.peerClosed, true);
  assert.ok(!f.states.includes("connected"));
});

test("OpenAI Live returns file tool results and continues speaking once per completed response", async t => {
  let executions = 0;
  const f = fixture(t, undefined, async call => { executions++; assert.equal(call.name, "read_current_file"); return { source: "notes.md", content: "The launch is Friday" }; });
  await f.session.start({ ...options, fileAccess: true });
  const event = { type: "response.done", response: { status: "completed", output: [{ type: "function_call", call_id: "read-1", name: "read_current_file", arguments: "{}" }] } };
  f.channel.onmessage?.({ data: JSON.stringify(event) }); f.channel.onmessage?.({ data: JSON.stringify(event) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(executions, 1);
  assert.deepEqual(f.sent, [{ type: "conversation.item.create", item: { type: "function_call_output", call_id: "read-1", output: JSON.stringify({ source: "notes.md", content: "The launch is Friday" }) } }, { type: "response.create" }]);
});

test("OpenAI Live rejects write tools and ignores late file results after stopping", async t => {
  const result = deferred<unknown>(); let signal: AbortSignal | undefined;
  const f = fixture(t, undefined, async (_call, currentSignal) => { signal = currentSignal; return result.promise; });
  await f.session.start({ ...options, fileAccess: true });
  const emit = (call_id: string, name: string) => f.channel.onmessage?.({ data: JSON.stringify({ type: "response.done", response: { status: "completed", output: [{ type: "function_call", call_id, name, arguments: "{}" }] } }) });
  emit("write", "create_note"); await new Promise(resolve => setImmediate(resolve));
  assert.match(JSON.stringify(f.sent), /unavailable/); assert.equal(signal, undefined);
  f.sent.length = 0; emit("read", "read_current_file"); await new Promise(resolve => setImmediate(resolve));
  f.session.stop(); result.resolve({ content: "late private text" }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(signal?.aborted, true); assert.deepEqual(f.sent, []);
});

test("OpenAI waits for an overlapping voice response to finish before following up on file results", async t => {
  const result = deferred<unknown>();
  const f = fixture(t, undefined, async () => result.promise);
  await f.session.start({ ...options, fileAccess: true });
  f.channel.onmessage?.({ data: JSON.stringify({ type: "response.done", response: { status: "completed", output: [{ type: "function_call", call_id: "file-1", name: "read_current_file", arguments: "{}" }] } }) });
  await new Promise(resolve => setImmediate(resolve));
  f.channel.onmessage?.({ data: JSON.stringify({ type: "response.created" }) });
  result.resolve({ content: "Friday" }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.sent.length, 1); assert.equal((f.sent[0] as { type: string }).type, "conversation.item.create");
  f.channel.onmessage?.({ data: JSON.stringify({ type: "response.done", response: { status: "completed", output: [] } }) });
  assert.deepEqual(f.sent.at(-1), { type: "response.create" });
});
