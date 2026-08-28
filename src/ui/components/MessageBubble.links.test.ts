import { describe, expect, it } from "vitest";
import { chatLinkFileRef } from "./chat/localFileLink";

describe("chatLinkFileRef", () => {
  it("converts a Windows path under the Vault to a Vault-relative path", () => {
    expect(chatLinkFileRef(
      "C:\\Users\\takes\\takeshy\\Knowledge\\gemihub-okf\\features\\dashboard.md",
      "C:\\Users\\takes\\takeshy",
    )).toEqual({ scope: "vault", path: "Knowledge/gemihub-okf/features/dashboard.md" });
  });

  it("keeps relative paths Vault-scoped", () => {
    expect(chatLinkFileRef("features/dashboard.md", "C:\\Vault"))
      .toEqual({ scope: "vault", path: "features/dashboard.md" });
  });

  it("keeps local paths outside the Vault absolute", () => {
    expect(chatLinkFileRef("file:///C:/Temp/dashboard.md", "C:\\Vault"))
      .toEqual({ scope: "absolute", path: "C:/Temp/dashboard.md" });
  });

  it("ignores web URLs", () => {
    expect(chatLinkFileRef("https://example.com/dashboard.md", "C:\\Vault")).toBeNull();
  });
});
