import { test, describe, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import { OllamaRuntime } from "./OllamaRuntime.js";
import child_process from "node:child_process";
import { EventEmitter } from "node:events";

describe("OllamaRuntime", () => {
  let runtime: OllamaRuntime;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    runtime = new OllamaRuntime();
    mock.restoreAll();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("isRunning returns true when fetch succeeds", async () => {
    globalThis.fetch = mock.fn(async () => {
      return { ok: true } as Response;
    });
    assert.strictEqual(await runtime.isRunning(), true);
  });

  test("isRunning returns false when fetch fails", async () => {
    globalThis.fetch = mock.fn(async () => {
      throw new Error("Network error");
    });
    assert.strictEqual(await runtime.isRunning(), false);
  });

  test("start spawns ollama serve and sets startedByUs", () => {
    const mockChild = new EventEmitter() as any;
    mock.method(child_process, "spawn", () => mockChild);

    runtime.start();
    // @ts-ignore - internal property
    assert.strictEqual(runtime.childProcess, mockChild);
    // @ts-ignore
    assert.strictEqual(runtime.startedByUs, true);
  });

  test("shutdown kills process if started by us", () => {
    const mockChild = new EventEmitter() as any;
    mockChild.kill = mock.fn();
    mock.method(child_process, "spawn", () => mockChild);

    runtime.start();
    runtime.shutdown();
    assert.strictEqual(mockChild.kill.mock.callCount(), 1);
  });

  test("shutdown does NOT kill process if not started by us", () => {
    const mockChild = new EventEmitter() as any;
    mockChild.kill = mock.fn();
    mock.method(child_process, "spawn", () => mockChild);

    // Simulate process already running
    // We don't call runtime.start()

    runtime.shutdown();
    assert.strictEqual(mockChild.kill.mock.callCount(), 0);
  });

  test("waitUntilReady returns when isRunning is true", async () => {
    let callCount = 0;
    globalThis.fetch = mock.fn(async () => {
      callCount++;
      return { ok: callCount === 2 } as Response;
    });

    await runtime.waitUntilReady(2000);
    assert.strictEqual(callCount, 2);
  });

  test("hasModel returns true if model exists", async () => {
    globalThis.fetch = mock.fn(async () => {
      return {
        ok: true,
        json: async () => ({ models: [{ name: "qwen2.5:1.5b" }] }),
      } as Response;
    });

    assert.strictEqual(await runtime.hasModel("qwen2.5:1.5b"), true);
    assert.strictEqual(await runtime.hasModel("non-existent"), false);
  });

  test("pullModel resolves on exit code 0", async () => {
    const mockChild = new EventEmitter() as any;
    mock.method(child_process, "spawn", () => mockChild);

    const pullPromise = runtime.pullModel("qwen2.5:1.5b");
    mockChild.emit("close", 0);

    await assert.doesNotReject(pullPromise);
  });

  test("pullModel rejects on non-zero exit code", async () => {
    const mockChild = new EventEmitter() as any;
    mock.method(child_process, "spawn", () => mockChild);

    const pullPromise = runtime.pullModel("qwen2.5:1.5b");
    mockChild.emit("close", 1);

    await assert.rejects(pullPromise, /Failed to pull model qwen2.5:1.5b/);
  });
});
