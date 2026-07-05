import { describe, expect, it } from "vitest";
import { buildCodexExecInvocation } from "./cliProvider";
import type { Message } from "../types";

describe("buildCodexExecInvocation", () => {
  it("passes initial prompts through stdin instead of argv", () => {
    const longPrompt = "x".repeat(200_000);
    const invocation = buildCodexExecInvocation(
      [{ role: "user", content: longPrompt } as Message],
      "system prompt",
    );

    expect(invocation.args).toEqual(["exec", "--json", "--skip-git-repo-check", "-"]);
    expect(invocation.args.join(" ")).not.toContain(longPrompt);
    expect(invocation.stdin).toContain(longPrompt);
    expect(invocation.stdin).toContain("system prompt");
  });

  it("passes resumed prompts through stdin instead of argv", () => {
    const longPrompt = "y".repeat(200_000);
    const invocation = buildCodexExecInvocation(
      [{ role: "user", content: longPrompt } as Message],
      "ignored on resume",
      "session-123",
    );

    expect(invocation.args).toEqual([
      "exec",
      "--json",
      "--skip-git-repo-check",
      "resume",
      "session-123",
      "-",
    ]);
    expect(invocation.args.join(" ")).not.toContain(longPrompt);
    expect(invocation.stdin).toBe(longPrompt);
  });
});
