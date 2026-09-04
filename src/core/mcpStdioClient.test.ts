import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpStdioClient } from "./mcpStdioClient";

const spawn = vi.hoisted(() => vi.fn());
vi.mock("obsidian", () => ({ Platform: { isMobile: false } }));
vi.mock("./cliProvider", () => ({ getChildProcess: () => ({ spawn }) }));

function makeChild(pid: number | undefined = 1234) {
  const child = Object.assign(new EventEmitter(), {
    pid, killed: false, exitCode: null as number | null, signalCode: null as string | null,
    stdin: Object.assign(new EventEmitter(), { destroyed: false, write: vi.fn() }),
    stdout: new EventEmitter(), stderr: new EventEmitter(),
    kill: vi.fn((_signal: string) => true),
  });
  child.kill.mockImplementation(signal => {
    child.killed = true;
    child.signalCode = signal;
    queueMicrotask(() => child.emit("close", null));
    return true;
  });
  spawn.mockReturnValue(child);
  return child;
}
function makeClient(command = "node", args: string[] = []) {
  return new McpStdioClient({ name: "test", transport: "stdio", url: "", enabled: true, command, args });
}
function respond(child: ReturnType<typeof makeChild>, value: Record<string, unknown>) {
  child.stdout.emit("data", Buffer.from(JSON.stringify(value) + "\n"));
}
beforeEach(() => { spawn.mockReset(); vi.stubGlobal("window", { setTimeout, clearTimeout }); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("MCP stdio launch and cleanup", () => {
  it("reports ENOENT immediately even if the child never emits close", async () => {
    const child = makeChild();
    child.pid = undefined;
    const start = makeClient("missing-node").initialize();
    child.emit("error", new Error("spawn missing-node ENOENT"));
    await expect(start).rejects.toThrow("spawn missing-node ENOENT");
    expect(child.stdin.write).toHaveBeenCalledTimes(1);
  });

  it("normalizes pasted command lines before spawning without a shell", async () => {
    const child = makeChild();
    child.stdin.write.mockImplementation((data: string) => {
      const request = JSON.parse(data);
      queueMicrotask(() => respond(child, { id: request.id, result: { resultType: "complete", supportedVersions: ["2026-07-28"] } }));
    });
    const client = makeClient('"C:\\Program Files\\node.exe" "C:\\my app\\server.js"', ["--verbose"]);
    await client.initialize();
    expect(spawn).toHaveBeenCalledWith("C:\\Program Files\\node.exe", ["C:\\my app\\server.js", "--verbose"], expect.objectContaining({ shell: false }));
    await client.close();
  });

  it("stops the child when legacy handshake negotiation fails", async () => {
    const child = makeChild();
    child.stdin.write.mockImplementation((data: string) => {
      const request = JSON.parse(data);
      queueMicrotask(() => respond(child, request.method === "server/discover"
        ? { id: request.id, error: { code: -32601, message: "Method not found" } }
        : { id: request.id, result: { protocolVersion: "unsupported" } }));
    });
    await expect(makeClient().initialize()).rejects.toThrow("unsupported protocol version");
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("includes stderr in timeout errors and stops the failed child", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const child = makeChild();
    const start = makeClient().initialize();
    const assertion = expect(start).rejects.toThrow("missing API key");
    child.stderr.emit("data", Buffer.from("missing API key"));
    await vi.advanceTimersByTimeAsync(125000);
    await assertion;
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });
});
