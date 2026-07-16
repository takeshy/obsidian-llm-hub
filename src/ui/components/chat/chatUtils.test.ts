import { describe, expect, it } from "vitest";
import {
	buildErrorMessage,
	isCaretOnFirstLine,
	isCaretOnLastLine,
	isRateLimitError,
	isRetryableRateLimitError,
	limitConversationHistory,
} from "./chatUtils";

describe("chat history limits", () => {
	const messages = Array.from({ length: 6 }, (_, index) => ({
		role: index % 2 === 0 ? "user" as const : "assistant" as const,
		content: String(index),
		timestamp: index,
	}));

	it("keeps only the current message when the limit is zero", () => {
		expect(limitConversationHistory(messages, 0).map(message => message.content)).toEqual(["5"]);
	});

	it("keeps the configured number of previous messages", () => {
		expect(limitConversationHistory(messages, 3).map(message => message.content)).toEqual(["2", "3", "4", "5"]);
	});

	it("clamps the configured limit to 0-99", () => {
		expect(limitConversationHistory(messages, -1)).toHaveLength(1);
		expect(limitConversationHistory(messages, 1000)).toHaveLength(messages.length);
	});

	it("detects the first and last textarea lines", () => {
		const value = "first\nmiddle\nlast";
		expect(isCaretOnFirstLine(value, 3)).toBe(true);
		expect(isCaretOnFirstLine(value, 8)).toBe(false);
		expect(isCaretOnLastLine(value, 8)).toBe(false);
		expect(isCaretOnLastLine(value, value.length)).toBe(true);
	});
});

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
