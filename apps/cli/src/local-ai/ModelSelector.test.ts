import { test, describe } from "node:test";
import assert from "node:assert";
import { ModelSelector } from "./ModelSelector.js";
import { HardwareProfile } from "./HardwareDetector.js";

const GB = 1024 * 1024 * 1024;

describe("ModelSelector", () => {
  const selector = new ModelSelector();

  const baseProfile: HardwareProfile = {
    cpu: { model: "Mock CPU", architecture: "x64", cores: 8, threads: 16 },
    platform: "linux",
    architecture: "x64",
    memory: { totalBytes: 32 * GB, availableBytes: 16 * GB },
    gpu: null,
    storage: { availableBytes: 100 * GB },
  };

  test("selects largest model when resources are abundant", () => {
    const profile: HardwareProfile = {
      ...baseProfile,
      memory: { totalBytes: 32 * GB, availableBytes: 16 * GB },
      gpu: { vendor: "NVIDIA", model: "RTX 3090", vramBytes: 24 * GB },
    };
    const selected = selector.select(profile);
    assert.strictEqual(selected.name, "qwen2.5:7b");
  });

  test("falls back to small model on low RAM", () => {
    const profile: HardwareProfile = {
      ...baseProfile,
      memory: { totalBytes: 6 * GB, availableBytes: 2 * GB },
      gpu: null,
    };
    const selected = selector.select(profile);
    assert.strictEqual(selected.name, "qwen2.5:1.5b");
  });

  test("selects medium model with enough RAM but no GPU", () => {
    const profile: HardwareProfile = {
      ...baseProfile,
      memory: { totalBytes: 12 * GB, availableBytes: 8 * GB },
      gpu: null,
    };
    const selected = selector.select(profile);
    assert.strictEqual(selected.name, "llama3.2");
  });

  test("throws error if storage is insufficient even for small model", () => {
    const profile: HardwareProfile = {
      ...baseProfile,
      storage: { availableBytes: 2 * GB },
    };
    assert.throws(() => {
      selector.select(profile);
    }, /Insufficient storage space/);
  });

  test("throws error if RAM is completely insufficient", () => {
    const profile: HardwareProfile = {
      ...baseProfile,
      memory: { totalBytes: 2 * GB, availableBytes: 1 * GB },
    };
    assert.throws(() => {
      selector.select(profile);
    }, /Hardware does not meet the minimum requirements/);
  });
});
