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
