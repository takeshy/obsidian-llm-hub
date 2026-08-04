import { describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { clearSecret, copySecret } from "./secretStorage";

function appWithSecrets(initial: Record<string, string>): {
  app: App;
  secrets: Map<string, string>;
  setSecret: ReturnType<typeof vi.fn>;
} {
  const secrets = new Map(Object.entries(initial));
  const setSecret = vi.fn((id: string, value: string) => {
    secrets.set(id, value);
  });
  const app = {
    secretStorage: {
      getSecret: (id: string) => secrets.get(id) ?? null,
      setSecret,
    },
  } as unknown as App;
  return { app, secrets, setSecret };
}

describe("copySecret", () => {
  it("copies a workspace secret while retaining the source", () => {
    const { app, secrets } = appWithSecrets({ old: "credential" });

    expect(copySecret(app, "old", "new")).toBe(true);
    expect(secrets.get("old")).toBe("credential");
    expect(secrets.get("new")).toBe("credential");
  });

  it("succeeds without writing when the source does not exist", () => {
    const { app, setSecret } = appWithSecrets({});

    expect(copySecret(app, "old", "new")).toBe(true);
    expect(setSecret).not.toHaveBeenCalled();
  });

  it("reuses an id that an earlier migration cleared", () => {
    // clearSecret() stores an empty value rather than deleting, so moving a
    // workspace folder back to a name it previously used must still work.
    const { app, secrets } = appWithSecrets({ old: "credential" });
    clearSecret(app, "new");

    expect(copySecret(app, "old", "new")).toBe(true);
    expect(secrets.get("new")).toBe("credential");
  });

  it("treats a cleared source as nothing to copy", () => {
    const { app, setSecret } = appWithSecrets({ old: "" });

    expect(copySecret(app, "old", "new")).toBe(true);
    expect(setSecret).not.toHaveBeenCalled();
  });

  it("does not overwrite an unrelated destination secret", () => {
    const { app, secrets, setSecret } = appWithSecrets({ old: "credential", new: "other" });

    expect(copySecret(app, "old", "new")).toBe(false);
    expect(secrets.get("new")).toBe("other");
    expect(setSecret).not.toHaveBeenCalled();
  });

  it("reports a destination write failure", () => {
    const { app } = appWithSecrets({ old: "credential" });
    vi.spyOn(app.secretStorage!, "setSecret").mockImplementation(() => {
      throw new Error("write failed");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(copySecret(app, "old", "new")).toBe(false);
  });
});
