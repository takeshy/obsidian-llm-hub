import { describe, expect, it } from "vitest";
import { buildCodexExecInvocation, parseCodexModelsCatalog } from "./cliProvider";
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

  it("adds a configured model to initial and resumed invocations", () => {
    const messages = [{ role: "user", content: "hello" } as Message];

    expect(buildCodexExecInvocation(messages, "system", undefined, " gpt-5.3-codex ").args)
      .toEqual(["exec", "--json", "--skip-git-repo-check", "--model", "gpt-5.3-codex", "-"]);
    expect(buildCodexExecInvocation(messages, "system", "session-123", "gpt-5.3-codex").args)
      .toEqual(["exec", "--json", "--skip-git-repo-check", "--model", "gpt-5.3-codex", "resume", "session-123", "-"]);
  });

  it("adds the confirmation bridge and read-only sandbox when configured", () => {
    const messages = [{ role: "user", content: "edit Note.md" } as Message];
    const url = "http://127.0.0.1:4321/mcp?token=secret";
    const invocation = buildCodexExecInvocation(messages, "system", undefined, undefined, url);

    expect(invocation.args).toEqual([
      "exec", "--json", "--skip-git-repo-check",
      "--sandbox", "read-only",
      "--config", 'approval_policy="never"',
      "--config", `mcp_servers.llm_hub_vault.url=${JSON.stringify(url)}`,
      "-",
    ]);
  });

  it("parses visible models from the Codex model catalog", () => {
    const catalog = JSON.stringify({ models: [
      { slug: "gpt-visible", display_name: "GPT Visible", visibility: "list" },
      { slug: "gpt-hidden", display_name: "GPT Hidden", visibility: "hide" },
      { slug: "gpt-fallback", visibility: "list" },
    ] });

    expect(parseCodexModelsCatalog(catalog)).toEqual([
      { slug: "gpt-visible", displayName: "GPT Visible" },
      { slug: "gpt-fallback", displayName: "gpt-fallback" },
    ]);
  });

});
