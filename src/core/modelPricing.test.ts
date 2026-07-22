import { describe, expect, it } from "vitest";
import { calculateCost, getKnownModels } from "./modelPricing";

describe("Gemini 3.6 Flash", () => {
  it("is offered as a known Gemini model", () => {
    expect(getKnownModels("gemini")).toContain("gemini-3.6-flash");
  });

  it("uses the published token pricing", () => {
    expect(calculateCost("gemini-3.6-flash", 1_000_000, 1_000_000)).toBe(9);
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
