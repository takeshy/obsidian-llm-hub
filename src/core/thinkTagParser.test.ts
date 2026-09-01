import { describe, expect, it } from "vitest";
import { parseThinkTags } from "./thinkTagParser";
import type { StreamChunk } from "../types";

/** Feed `tokens` one by one through the parser and collect merged output. */
function run(tokens: string[]): { thinking: string; text: string } {
  let inThinkTag: boolean | string = false;
  let tagBuffer = "";
  const items: StreamChunk[] = [];
  for (const tok of tokens) {
    const r = parseThinkTags(tok, inThinkTag, tagBuffer);
    inThinkTag = r.inThinkTag;
    tagBuffer = r.tagBuffer;
    items.push(...r.items);
  }
  if (tagBuffer) items.push({ type: inThinkTag ? "thinking" : "text", content: tagBuffer });
  const join = (t: string) => items.filter(i => i.type === t).map(i => (i as { content: string }).content).join("");
  return { thinking: join("thinking"), text: join("text") };
}

describe("parseThinkTags", () => {
  it("extracts <think> blocks", () => {
    expect(run(["<think>plan</think>answer"])).toEqual({ thinking: "plan", text: "answer" });
  });

  it("handles <think> tags split across chunks", () => {
    expect(run(["<th", "ink>pl", "an</thi", "nk>ans", "wer"])).toEqual({ thinking: "plan", text: "answer" });
  });

  it("extracts Gemma <|channel>thought ... <channel|> blocks", () => {
    expect(run(["<|channel>thought\nHere is my plan.<channel|>Hello!"]))
      .toEqual({ thinking: "\nHere is my plan.", text: "Hello!" });
  });

  it("handles Gemma markers split across chunks", () => {
    expect(run(["<|", "channel>", "thought", "\nstep 1", "<chan", "nel|>", "Hi"]))
      .toEqual({ thinking: "\nstep 1", text: "Hi" });
  });

  it("passes plain text through untouched", () => {
    expect(run(["Hello ", "<b>bold</b>"])).toEqual({ thinking: "", text: "Hello <b>bold</b>" });
  });
});
