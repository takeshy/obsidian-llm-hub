import { describe, expect, it } from "vitest";
import { calculateCost, getKnownModels } from "./modelPricing";

describe("Gemini 3.8 Flash", () => {
  it("is offered as a known Gemini model", () => {
    const models = getKnownModels("gemini");
    expect(models).toContain("gemini-3.8-flash");
    expect(models).not.toContain("gemini-3.7-flash");
    expect(models).not.toContain("gemini-3.5-flash");
    expect(models).not.toContain("gemini-3.6-flash");
  });

  it("uses the published token pricing", () => {
    expect(calculateCost("gemini-3.8-flash", 1_000_000, 1_000_000)).toBe(4.5);
  });
});

describe("Gemini 3.5 Flash Lite", () => {
  it("replaces deprecated Flash Lite models in the known model list", () => {
    const models = getKnownModels("gemini");
    expect(models).toContain("gemini-3.5-flash-lite");
    expect(models).not.toContain("gemini-3.1-flash-lite");
    expect(models).not.toContain("gemini-2.5-flash-lite");
  });

  it("uses the published token pricing", () => {
    expect(calculateCost("gemini-3.5-flash-lite", 1_000_000, 1_000_000)).toBe(2.8);
  });
});

describe("Claude Opus 5", () => {
  it("is offered as a known Anthropic model", () => {
    expect(getKnownModels("anthropic")).toContain("claude-opus-5");
  });

  it("uses the published token pricing", () => {
    expect(calculateCost("claude-opus-5", 1_000_000, 1_000_000)).toBe(30);
  });

  it("prices dated model variants through prefix matching", () => {
    expect(calculateCost("claude-opus-5-20260724", 1_000_000, 1_000_000)).toBe(30);
  });
});

describe("OpenCode Go", () => {
  it("does not inject a stale static model catalog", () => {
    expect(getKnownModels("opencodego")).toEqual([]);
  });
});
