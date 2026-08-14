import { HardwareProfile } from "./HardwareDetector.js";
import { ModelRegistry, ModelProfile } from "./ModelRegistry.js";

const STORAGE_SAFETY_MARGIN = 1024 * 1024 * 1024; // 1GB

export class ModelSelector {
  select(profile: HardwareProfile): ModelProfile {
    const availableDisk = profile.storage.availableBytes;

    // Filter by storage
    const storageViableModels = ModelRegistry.filter(
      (m) => m.approximateDiskBytes + STORAGE_SAFETY_MARGIN <= availableDisk
    );

    if (storageViableModels.length === 0) {
      throw new Error("Insufficient storage space for any model.");
    }

    // Sort models by RAM requirements (largest to smallest)
    const sortedModels = [...storageViableModels].sort((a, b) => b.minRamBytes - a.minRamBytes);

    for (const model of sortedModels) {
      const ramOk = profile.memory.totalBytes >= model.minRamBytes;
      
      let vramOk = true;
      if (model.minVramBytes > 0) {
        if (profile.gpu) {
          vramOk = profile.gpu.vramBytes >= model.minVramBytes;
        } else {
          // Fall back to conservative RAM-based selection if GPU is unknown
          vramOk = profile.memory.totalBytes >= (model.minRamBytes + model.minVramBytes);
        }
      }

      if (ramOk && vramOk) {
        return model;
      }
    }

    throw new Error("Hardware does not meet the minimum requirements for any model.");
  }
}
