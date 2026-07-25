import { describe, expect, it } from "vitest";
import { isImageGenerationModel } from "./index";

describe("isImageGenerationModel", () => {
  it.each([
    "gemini-2.5-flash-image",
    "gemini-3-pro-image",
    "gemini-3.1-flash-image",
    "gemini-3.1-flash-lite-image",
    "api:google:gemini-3.1-flash-lite-image",
    "dall-e-3",
  ])("recognizes image model %s", (model) => {
    expect(isImageGenerationModel(model)).toBe(true);
  });

  it.each([
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gpt-4o",
  ])("does not classify text model %s as image generation", (model) => {
    expect(isImageGenerationModel(model)).toBe(false);
  });
});
