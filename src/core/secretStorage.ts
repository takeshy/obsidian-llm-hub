import type { App } from "obsidian";
import { formatError } from "obsidian-llm-hub-common/core";

/**
 * Thin wrapper around Obsidian's SecretStorage (App 1.11.4+).
 *
 * Secrets are stored per device and stay out of the vault, so they are never
 * carried along by Obsidian Sync or a Git-tracked `.obsidian` folder.
 */

export function isSecretStorageAvailable(app: App): boolean {
  return !!app.secretStorage;
}

/** Read and parse a JSON secret. Returns null when absent or unreadable. */
export function readSecretJson<T>(app: App, id: string): T | null {
  if (!app.secretStorage) return null;
  try {
    const raw = app.secretStorage.getSecret(id);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`LLM Hub: Failed to read secret "${id}":`, formatError(e));
    return null;
  }
}

/**
 * Write a JSON secret.
 *
 * Returns false when the write failed — callers must keep the plaintext copy in
 * that case, so a storage error never destroys the only copy of a credential.
 */
export function writeSecretJson(app: App, id: string, value: unknown): boolean {
  if (!app.secretStorage) return false;
  try {
    app.secretStorage.setSecret(id, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`LLM Hub: Failed to write secret "${id}":`, formatError(e));
    return false;
  }
}

/** SecretStorage has no delete API, so clearing means storing an empty value. */
export function clearSecret(app: App, id: string): void {
  if (!app.secretStorage) return;
  try {
    app.secretStorage.setSecret(id, "");
  } catch (e) {
    console.error(`LLM Hub: Failed to clear secret "${id}":`, formatError(e));
  }
}

/**
 * Copy a secret to a new id without removing the source.
 *
 * Keeping the source until the caller's related operation succeeds makes this
 * safe to use when migrating identifiers alongside a vault file rename.
 *
 * Cleared secrets read back as an empty string rather than null, so an empty
 * value counts as absent — otherwise reusing an id that was cleared by an
 * earlier migration would look like a conflict forever.
 */
export function copySecret(app: App, sourceId: string, destinationId: string): boolean {
  if (!app.secretStorage || sourceId === destinationId) return true;
  try {
    const secret = app.secretStorage.getSecret(sourceId);
    if (!secret) return true;
    const destination = app.secretStorage.getSecret(destinationId);
    if (destination) return destination === secret;
    app.secretStorage.setSecret(destinationId, secret);
    return true;
  } catch (e) {
    console.error(
      `LLM Hub: Failed to copy secret "${sourceId}" to "${destinationId}":`,
      formatError(e),
    );
    return false;
  }
}
