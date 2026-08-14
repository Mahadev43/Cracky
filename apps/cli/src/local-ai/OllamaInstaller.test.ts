import { test, describe, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { OllamaInstaller } from "./OllamaInstaller.js";
import child_process from "node:child_process";
import os from "node:os";
import { EventEmitter } from "node:events";

describe("OllamaInstaller", () => {
  let installer: OllamaInstaller;

  beforeEach(() => {
    installer = new OllamaInstaller();
    mock.restoreAll();
  });

  test("isInstalled returns true when execSync succeeds", () => {
    mock.method(child_process, "execSync", () => Buffer.from("ollama version 0.1"));
    assert.strictEqual(installer.isInstalled(), true);
  });

  test("isInstalled returns false when execSync fails", () => {
    mock.method(child_process, "execSync", () => {
      throw new Error("Command failed");
    });
    assert.strictEqual(installer.isInstalled(), false);
  });

  test("install succeeds on linux", async () => {
    mock.method(os, "platform", () => "linux");
    
    const mockChild = new EventEmitter() as any;
    mock.method(child_process, "spawn", () => mockChild);

    const installPromise = installer.install();
    mockChild.emit("close", 0);

    await assert.doesNotReject(installPromise);
  });

  test("install rejects on linux if script fails", async () => {
    mock.method(os, "platform", () => "linux");
    
    const mockChild = new EventEmitter() as any;
    mock.method(child_process, "spawn", () => mockChild);

    const installPromise = installer.install();
    mockChild.emit("close", 1);

    await assert.rejects(installPromise, /Installation script exited with code 1/);
  });

  test("install rejects on macOS", async () => {
    mock.method(os, "platform", () => "darwin");
    await assert.rejects(installer.install(), /Automatic installation is not supported on macOS/);
  });

  test("install rejects on Windows", async () => {
    mock.method(os, "platform", () => "win32");
    await assert.rejects(installer.install(), /Automatic installation is not supported on Windows/);
  });
});
