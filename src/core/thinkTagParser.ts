/**
 * Shared parser for reasoning tags embedded in streaming LLM content.
 * Used by openaiProvider and localLlmProvider to extract reasoning tokens
 * from models that embed thinking in content:
 *   - <think>...</think>                 (Qwen, DeepSeek, MiniMax)
 *   - <|channel>thought ... <channel|>   (Gemma 4 via GenieX)
 */

import type { StreamChunk } from "../types";

interface ThinkTagPair {
  open: string;
  close: string;
}

const THINK_TAG_PAIRS: ThinkTagPair[] = [
  { open: "<think>", close: "</think>" },
  { open: "<|channel>thought", close: "<channel|>" },
];

/** Index into THINK_TAG_PAIRS of the currently open tag, keyed by open string. */
function pairForOpen(open: string): ThinkTagPair {
  return THINK_TAG_PAIRS.find(p => p.open === open) ?? THINK_TAG_PAIRS[0];
}

/**
 * Parse reasoning tags from streaming content.
 *
 * `inThinkTag` may be `false`, `true` (legacy: <think>), or the open-tag
 * string of the pair currently being parsed. Callers can treat it as a
 * boolean for "are we inside a thinking block" checks.
 */
export function parseThinkTags(
  content: string,
  inThinkTag: boolean | string,
  tagBuffer: string,
): { items: StreamChunk[]; inThinkTag: boolean | string; tagBuffer: string } {
  const items: StreamChunk[] = [];
  let text = tagBuffer + content;
  tagBuffer = "";
  let currentOpen: string | null = inThinkTag === true
    ? THINK_TAG_PAIRS[0].open
    : (inThinkTag || null);

  while (text.length > 0) {
    if (currentOpen === null) {
      // Find the earliest opening tag among all supported pairs.
      let bestIdx = -1;
      let bestPair: ThinkTagPair | null = null;
      for (const pair of THINK_TAG_PAIRS) {
        const idx = text.indexOf(pair.open);
        if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
          bestIdx = idx;
          bestPair = pair;
        }
      }
      if (bestPair !== null) {
        if (bestIdx > 0) {
          items.push({ type: "text", content: text.slice(0, bestIdx) });
        }
        currentOpen = bestPair.open;
        text = text.slice(bestIdx + bestPair.open.length);
      } else {
        let partial = 0;
        for (const pair of THINK_TAG_PAIRS) {
          partial = Math.max(partial, getPartialTagMatch(text, pair.open));
        }
        if (partial > 0) {
          const safe = text.slice(0, text.length - partial);
          if (safe) items.push({ type: "text", content: safe });
          tagBuffer = text.slice(text.length - partial);
          text = "";
        } else {
          items.push({ type: "text", content: text });
          text = "";
        }
      }
    } else {
      const close = pairForOpen(currentOpen).close;
      const closeIdx = text.indexOf(close);
      if (closeIdx !== -1) {
        if (closeIdx > 0) {
          items.push({ type: "thinking", content: text.slice(0, closeIdx) });
        }
        currentOpen = null;
        text = text.slice(closeIdx + close.length);
      } else {
        const partial = getPartialTagMatch(text, close);
        if (partial > 0) {
          const safe = text.slice(0, text.length - partial);
          if (safe) items.push({ type: "thinking", content: safe });
          tagBuffer = text.slice(text.length - partial);
          text = "";
        } else {
          items.push({ type: "thinking", content: text });
          text = "";
        }
      }
    }
  }

  return { items, inThinkTag: currentOpen ?? false, tagBuffer };
}

/** Check if the end of `text` is a prefix of `tag`. Returns match length (0 if none). */
function getPartialTagMatch(text: string, tag: string): number {
  const maxCheck = Math.min(text.length, tag.length - 1);
  for (let len = maxCheck; len > 0; len--) {
    if (text.endsWith(tag.slice(0, len))) {
      return len;
    }
  }
  return 0;
}
