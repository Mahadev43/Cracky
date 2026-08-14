import os from "node:os";
import fs from "node:fs/promises";
import child_process from "node:child_process";
import util from "node:util";

function execAsync(cmd: string, options: any): Promise<{stdout: string, stderr: string}> {
  return new Promise((resolve, reject) => {
    child_process.exec(cmd, options, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}

export interface HardwareProfile {
  cpu: {
    model: string;
    architecture: string;
    cores: number;
    threads: number;
  };
  memory: {
    totalBytes: number;
    availableBytes: number;
  };
  gpu: {
    vendor: string;
    model: string;
    vramBytes: number;
  } | null;
  storage: {
    availableBytes: number;
  };
  platform: string;
  architecture: string;
}

export class HardwareDetector {
  async detect(): Promise<HardwareProfile> {
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 && cpus[0] ? cpus[0].model : "Unknown CPU";
    // `cpus` array length is logical cores (threads)
    const threads = cpus.length;
    const cores = threads > 1 ? Math.floor(threads / 2) : threads; // Rough heuristic

    const totalMemory = os.totalmem();
    const availableMemory = os.freemem();

    const platform = os.platform();
    const architecture = os.arch();

    let storageAvailable = 0;
    try {
      const stat = await fs.statfs(".");
      storageAvailable = Number(stat.bavail) * Number(stat.bsize);
    } catch (e) {
      // Fallback if statfs fails
      storageAvailable = 0;
    }

    let gpu = null;
    try {
      gpu = await this.detectGPU(platform);
    } catch (e) {
      gpu = null; // Gracefully degrade if we fail to detect GPU
    }

    return {
      cpu: {
        model: cpuModel,
        architecture,
        cores,
        threads,
      },
      memory: {
        totalBytes: totalMemory,
        availableBytes: availableMemory,
      },
      gpu,
      storage: {
        availableBytes: storageAvailable,
      },
      platform,
      architecture,
    };
  }

  private async detectGPU(platform: string): Promise<HardwareProfile["gpu"] | null> {
    if (platform === "linux") {
      try {
        const { stdout } = await execAsync("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader", { timeout: 2000 });
        const lines = stdout.trim().split("\n");
        if (lines.length > 0 && lines[0]) {
          const [model, memStr] = lines[0].split(", ");
          // memStr is usually like "4096 MiB"
          const vramMb = memStr ? parseInt(memStr.replace(/[^0-9]/g, ""), 10) : 0;
          return {
            vendor: "NVIDIA",
            model: model ? model.trim() : "Unknown",
            vramBytes: vramMb * 1024 * 1024,
          };
        }
      } catch (e) {
        // Not nvidia or not installed
      }
    } else if (platform === "darwin") {
      try {
        const { stdout } = await execAsync("system_profiler SPDisplaysDataType", { timeout: 2000 });
        const modelMatch = stdout.match(/Chipset Model:\s*(.+)/);
        const vramMatch = stdout.match(/VRAM \(Total\):\s*(.+)/);
        
        let vramBytes = 0;
        if (vramMatch && vramMatch[1]) {
          const vramStr = vramMatch[1].trim();
          if (vramStr.includes("GB")) {
            vramBytes = parseInt(vramStr, 10) * 1024 * 1024 * 1024;
          } else if (vramStr.includes("MB")) {
            vramBytes = parseInt(vramStr, 10) * 1024 * 1024;
          }
        } else if (stdout.includes("Unified Memory")) {
          // Apple Silicon uses unified memory
          vramBytes = os.totalmem();
        }

        if (modelMatch && modelMatch[1]) {
          return {
            vendor: "Apple",
            model: modelMatch[1].trim(),
            vramBytes,
          };
        }
      } catch (e) {
        // Failed
      }
    } else if (platform === "win32") {
      try {
        // wmic path win32_VideoController get name,AdapterRAM /format:csv
        const { stdout } = await execAsync("wmic path win32_VideoController get name,AdapterRAM /format:csv", { timeout: 2000 });
        const lines = stdout.trim().split("\n");
        if (lines.length > 1 && lines[1]) {
          const parts = lines[1].split(",");
          if (parts.length >= 3) {
            const vramBytes = parts[1] ? parseInt(parts[1].trim(), 10) : 0;
            const model = parts[2] ? parts[2].trim() : "Unknown";
            return {
              vendor: "Unknown",
              model,
              vramBytes: isNaN(vramBytes) ? 0 : vramBytes,
            };
          }
        }
      } catch (e) {
        // Failed
      }
    }

    return null;
  }
}
