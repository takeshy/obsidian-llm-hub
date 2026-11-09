// Ported from KiokuFlow; provider transports run locally in Obsidian.
import { createOpenAILiveAnswer } from "./live-connection";
import { liveMicrophoneConstraints, openLiveMicrophone, setLiveAudioOutput } from "./live-audio";
import type { LiveConnectionConfig } from "./live-session";
export const LIVE_MODELS = ["gpt-realtime-2.1", "gpt-realtime-2.1-mini", "gpt-realtime", "gpt-realtime-mini"] as const;
export const LIVE_VOICES = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"] as const;
import type { LiveCallbacks, LiveOptions, LiveTranscript } from "./live-session";
import { LiveToolDispatcher } from "./live-tool-definitions";
export type { LiveState, LiveTranscript } from "./live-session";

/** Owns every resource in one call, including cancellation during mic permission/SDP negotiation. */
export class OpenAILiveSession {
  private peer: RTCPeerConnection | null = null;
  private stream: MediaStream | null = null;
  private channel: RTCDataChannel | null = null;
  private abort: AbortController | null = null;
  private timeout: number | null = null;
  private generation = 0;
  private active = false;
  private transcripts = new Map<string, LiveTranscript>();
  private tools: LiveToolDispatcher | null = null;
  private handledTools = new Set<string>();
  private responseActive = false;
  private pendingToolBatches = 0;
  private needsToolResponse = false;
  constructor(private callbacks: LiveCallbacks, private connection: LiveConnectionConfig) {}

  stop() {
    this.generation++;
    this.active = false;
    this.tools?.cancel(); this.tools = null;
    this.responseActive = false; this.pendingToolBatches = 0; this.needsToolResponse = false;
    if (this.timeout) window.clearTimeout(this.timeout);
    this.timeout = null;
    this.abort?.abort(); this.abort = null;
    if (this.channel) { this.channel.onclose = null; this.channel.onerror = null; this.channel.close(); this.channel = null; }
    if (this.peer) { this.peer.onconnectionstatechange = null; this.peer.ontrack = null; this.peer.close(); this.peer = null; }
    this.stream?.getTracks().forEach((track) => track.stop()); this.stream = null;
    this.callbacks.audio.pause();
    this.callbacks.audio.srcObject = null;
    this.callbacks.onState("idle");
  }

  mute(muted: boolean) { this.stream?.getAudioTracks().forEach((track) => { track.enabled = !muted; }); }

  private fail(message: string) { this.stop(); this.callbacks.onError(message); }

  private continueAfterTools() {
    if (!this.needsToolResponse || this.responseActive || this.pendingToolBatches || !this.channel) return;
    this.needsToolResponse = false; this.responseActive = true;
    this.channel.send(JSON.stringify({ type: "response.create" }));
  }

  private receive(raw: string) {
    const event = JSON.parse(raw) as {
      type: string; item_id?: string; delta?: string; transcript?: string;
      error?: { message?: string }; response?: { status?: string; status_details?: { error?: { message?: string } }; output?: { type?: string; call_id?: string; name?: string; arguments?: string }[] };
    };
    if (event.type === "response.created") this.responseActive = true;
    if (event.type === "response.done") this.responseActive = false;
    if (event.type === "input_audio_buffer.speech_started" && event.item_id) {
      const id = `user:${event.item_id}`;
      this.transcripts.set(id, { id, role: "user", text: "" });
    }
    if (event.type === "error" || event.type === "conversation.item.input_audio_transcription.failed") {
      this.fail(event.error?.message || "Live conversation failed"); return;
    }
    if (event.type === "response.done" && event.response?.status === "failed") {
      this.fail(event.response.status_details?.error?.message || "Live response failed"); return;
    }
    if (event.type === "response.done" && event.response?.status === "completed") {
      const calls = (event.response.output || []).filter(call => call.type === "function_call" && call.call_id && !this.handledTools.has(call.call_id));
      const tools = this.tools, channel = this.channel, generation = this.generation;
      if (tools && channel && calls.length) {
        this.pendingToolBatches++;
        calls.forEach(call => this.handledTools.add(call.call_id!));
        void Promise.all(calls.map(async call => {
          let args: Record<string, unknown>;
          try { args = JSON.parse(call.arguments || "{}") as Record<string, unknown>; } catch { return { id: call.call_id!, result: { error: "Invalid JSON tool arguments." } }; }
          return { id: call.call_id!, result: await tools.run({ id: call.call_id!, name: call.name || "", args }) };
        })).then(results => {
          if (!this.active || generation !== this.generation) return;
          for (const { id, result } of results) channel.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: id, output: JSON.stringify(result) } }));
          this.pendingToolBatches--; this.needsToolResponse = true;
          this.continueAfterTools();
        }).catch(() => { if (this.active && generation === this.generation) this.fail("Could not return file results to Live."); });
      }
    }
    if (event.type === "response.done") this.continueAfterTools();
    const user = event.type === "conversation.item.input_audio_transcription.delta" || event.type === "conversation.item.input_audio_transcription.completed";
    const assistant = event.type === "response.output_audio_transcript.delta" || event.type === "response.output_audio_transcript.done";
    if ((!user && !assistant) || !event.item_id) return;
    const id = `${user ? "user" : "assistant"}:${event.item_id}`;
    const previous = this.transcripts.get(id);
    this.transcripts.set(id, {
      id, role: user ? "user" : "assistant",
      text: event.transcript ?? ((previous?.text || "") + (event.delta || "")),
    });
    this.callbacks.onTranscript([...this.transcripts.values()]);
  }

  async start(options: LiveOptions) {
    this.stop();
    const generation = this.generation;
    this.active = true;
    this.tools = new LiveToolDispatcher(options, this.callbacks.onToolCall); this.handledTools.clear();
    this.transcripts.clear(); this.callbacks.onTranscript([]);
    this.callbacks.onState("connecting");
    this.abort = new AbortController();
    const signal = this.abort.signal;
    const isCurrent = () => this.active && this.generation === generation;
    this.timeout = window.setTimeout(() => { if (isCurrent()) this.fail("Live connection timed out. Please try again."); }, 30_000);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
        throw new Error("Live requires a browser with microphone access over HTTPS or localhost.");
      }
      const stream = await openLiveMicrophone(liveMicrophoneConstraints(options.inputDeviceId));
      if (!isCurrent()) { stream.getTracks().forEach((track) => track.stop()); return; }
      this.stream = stream;
      await setLiveAudioOutput(this.callbacks.audio, options.outputDeviceId);
      if (!isCurrent()) return;
      const peer = new RTCPeerConnection(); this.peer = peer;
      peer.ontrack = (event) => {
        if (!isCurrent()) return;
        this.callbacks.audio.srcObject = event.streams[0] || new MediaStream([event.track]);
        void this.callbacks.audio.play().catch(() => {
          if (isCurrent()) this.callbacks.onError("Audio playback is blocked. Tap the conversation screen to enable audio.");
        });
      };
      peer.onconnectionstatechange = () => {
        if (!isCurrent()) return;
        if (["failed", "closed", "disconnected"].includes(peer.connectionState)) this.fail("Live connection ended. Start a new conversation to reconnect.");
      };
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const channel = peer.createDataChannel("oai-events"); this.channel = channel;
      channel.onopen = () => {
        if (!isCurrent()) return;
        if (this.timeout) window.clearTimeout(this.timeout);
        this.timeout = null;
        this.callbacks.onState("connected");
      };
      channel.onmessage = (event) => {
        if (!isCurrent()) return;
        try { this.receive(String(event.data)); } catch { this.fail("Invalid Live event received"); }
      };
      channel.onclose = () => { if (isCurrent()) this.fail("Live conversation ended."); };
      channel.onerror = () => { if (isCurrent()) this.fail("Live connection error"); };
      const offer = await peer.createOffer();
      if (!isCurrent()) return;
      await peer.setLocalDescription(offer);
      if (!isCurrent()) return;
      if (!offer.sdp) throw new Error("Could not create an audio offer.");
      const answer = await createOpenAILiveAnswer(options, offer.sdp, this.connection, signal);
      if (!isCurrent()) return;
      await peer.setRemoteDescription({ type: "answer", sdp: answer });
    } catch (error) {
      if (isCurrent()) this.fail(error instanceof Error ? error.message : String(error));
    }
  }
}
