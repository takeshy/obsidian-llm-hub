import { describe, expect, it } from "vitest";
import { buildErrorMessage, isRateLimitError, isRetryableRateLimitError } from "./chatUtils";

describe("rate limit error handling", () => {
	it("retries a generic transient 429", () => {
		const error = Object.assign(new Error("429 RESOURCE_EXHAUSTED: rate limit exceeded"), {
			code: 429,
			status: "RESOURCE_EXHAUSTED",
		});

		expect(isRateLimitError(error)).toBe(true);
		expect(isRetryableRateLimitError(error)).toBe(true);
	});

	it("does not retry a hard Gemini quota failure", () => {
		const error = Object.assign(new Error(
			"You exceeded your current quota, please check your plan and billing details. " +
			"To monitor your current usage, head to: https://ai.dev/rate-limit.",
		), { code: 429, status: "RESOURCE_EXHAUSTED" });

		expect(isRateLimitError(error)).toBe(true);
		expect(isRetryableRateLimitError(error)).toBe(false);
	});

	it("does not retry daily or monthly quota messages", () => {
		expect(isRetryableRateLimitError(new Error("429: Requests per day quota exceeded"))).toBe(false);
		expect(isRetryableRateLimitError(new Error("429: monthly Google Search quota exceeded"))).toBe(false);
	});

	it("preserves the provider explanation for a hard quota failure", () => {
		const error = Object.assign(new Error("You exceeded your current quota; check billing details."), {
			code: 429,
		});

		expect(buildErrorMessage(error)).toContain("You exceeded your current quota; check billing details.");
	});
});
