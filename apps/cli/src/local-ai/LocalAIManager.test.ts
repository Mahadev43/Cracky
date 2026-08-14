import { test, describe, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { LocalAIManager } from "./LocalAIManager.js";
import { OllamaInstaller } from "./OllamaInstaller.js";
import { OllamaRuntime } from "./OllamaRuntime.js";

describe("LocalAIManager", () => {
  let manager: LocalAIManager;
  let installer: OllamaInstaller;
  let runtime: OllamaRuntime;

  beforeEach(() => {
    installer = new OllamaInstaller();
    runtime = new OllamaRuntime();
    manager = new LocalAIManager(installer, runtime);
    mock.restoreAll();
  });

  test("prepareEnvironment calls install if not installed", async () => {
    mock.method(installer, "isInstalled", () => false);
    mock.method(installer, "install", async () => {});
    mock.method(runtime, "isRunning", async () => true);
    mock.method(runtime, "hasModel", async () => true);
    
    // Suppress console output for test
    mock.method(process.stdout, "write", () => true);

    await manager.prepareEnvironment("test-model");

    assert.strictEqual((installer.install as any).mock.callCount(), 1);
  });

  test("prepareEnvironment skips install if already installed", async () => {
    mock.method(installer, "isInstalled", () => true);
    mock.method(installer, "install", async () => {});
    mock.method(runtime, "isRunning", async () => true);
    mock.method(runtime, "hasModel", async () => true);

    mock.method(process.stdout, "write", () => true);

    await manager.prepareEnvironment("test-model");

    assert.strictEqual((installer.install as any).mock.callCount(), 0);
  });

  test("prepareEnvironment starts runtime and waits if not running", async () => {
    mock.method(installer, "isInstalled", () => true);
    mock.method(runtime, "isRunning", async () => false);
    mock.method(runtime, "start", () => {});
    mock.method(runtime, "waitUntilReady", async () => {});
    mock.method(runtime, "hasModel", async () => true);

    mock.method(process.stdout, "write", () => true);

    await manager.prepareEnvironment("test-model");

    assert.strictEqual((runtime.start as any).mock.callCount(), 1);
    assert.strictEqual((runtime.waitUntilReady as any).mock.callCount(), 1);
  });

  test("prepareEnvironment pulls model if missing", async () => {
    mock.method(installer, "isInstalled", () => true);
    mock.method(runtime, "isRunning", async () => true);
    mock.method(runtime, "hasModel", async () => false);
    mock.method(runtime, "pullModel", async () => {});

    mock.method(process.stdout, "write", () => true);

    await manager.prepareEnvironment("test-model");

    assert.strictEqual((runtime.pullModel as any).mock.callCount(), 1);
    const callArgs = (runtime.pullModel as any).mock.calls[0].arguments;
    assert.strictEqual(callArgs[0], "test-model");
  });

  test("shutdown delegates to runtime", () => {
    mock.method(runtime, "shutdown", () => {});
    manager.shutdown();
    assert.strictEqual((runtime.shutdown as any).mock.callCount(), 1);
  });
});
