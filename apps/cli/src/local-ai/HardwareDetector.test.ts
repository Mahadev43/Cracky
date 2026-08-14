import { test, describe, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { HardwareDetector } from "./HardwareDetector.js";
import os from "node:os";
import fs from "node:fs/promises";
import child_process from "node:child_process";

describe("HardwareDetector", () => {
  let detector: HardwareDetector;

  beforeEach(() => {
    detector = new HardwareDetector();
    mock.restoreAll();
  });

  test("detects CPU, RAM, and Storage", async () => {
    mock.method(os, "cpus", () => [{ model: "Mock CPU" }, { model: "Mock CPU" }]);
    mock.method(os, "totalmem", () => 16 * 1024 * 1024 * 1024);
    mock.method(os, "freemem", () => 8 * 1024 * 1024 * 1024);
    mock.method(os, "platform", () => "linux");
    mock.method(os, "arch", () => "x64");
    
    mock.method(fs, "statfs", async () => ({ bavail: 1000, bsize: 1024 }));
    
    // Make GPU detection fail gracefully
    mock.method(child_process, "exec", (cmd: any, opts: any, callback: any) => {
      callback(new Error("Command failed"), "", "");
    });

    const profile = await detector.detect();

    assert.strictEqual(profile.cpu.model, "Mock CPU");
    assert.strictEqual(profile.cpu.threads, 2);
    assert.strictEqual(profile.cpu.cores, 1);
    
    assert.strictEqual(profile.memory.totalBytes, 16 * 1024 * 1024 * 1024);
    assert.strictEqual(profile.memory.availableBytes, 8 * 1024 * 1024 * 1024);
    
    assert.strictEqual(profile.platform, "linux");
    assert.strictEqual(profile.architecture, "x64");
    
    assert.strictEqual(profile.storage.availableBytes, 1024000);
    
    assert.strictEqual(profile.gpu, null); // Gracefully fell back to null
  });

  test("detects GPU on linux", async () => {
    mock.method(os, "platform", () => "linux");
    
    mock.method(child_process, "exec", (cmd: any, opts: any, callback: any) => {
      callback(null, "RTX 3090, 24576 MiB\n", "");
    });

    const profile = await detector.detect();
    assert.deepStrictEqual(profile.gpu, {
      vendor: "NVIDIA",
      model: "RTX 3090",
      vramBytes: 24576 * 1024 * 1024
    });
  });

  test("detects GPU gracefully fails if command missing on linux", async () => {
    mock.method(os, "platform", () => "linux");
    
    mock.method(child_process, "exec", (cmd: any, opts: any, callback: any) => {
      callback(new Error("Command not found"), "", "");
    });

    const profile = await detector.detect();
    assert.strictEqual(profile.gpu, null);
  });
});
