export interface ModelProfile {
  name: string;
  minRamBytes: number;
  minVramBytes: number;
  approximateDiskBytes: number;
}

export const ModelRegistry: ModelProfile[] = [
  {
    name: "qwen2.5:1.5b",
    minRamBytes: 4 * 1024 * 1024 * 1024, // 4GB
    minVramBytes: 0,
    approximateDiskBytes: 1.5 * 1024 * 1024 * 1024, // 1.5GB
  },
  {
    name: "llama3.2",
    minRamBytes: 8 * 1024 * 1024 * 1024, // 8GB
    minVramBytes: 4 * 1024 * 1024 * 1024, // 4GB
    approximateDiskBytes: 4 * 1024 * 1024 * 1024, // 4GB
  },
  {
    name: "qwen2.5:7b",
    minRamBytes: 16 * 1024 * 1024 * 1024, // 16GB
    minVramBytes: 8 * 1024 * 1024 * 1024, // 8GB
    approximateDiskBytes: 5 * 1024 * 1024 * 1024, // 5GB
  }
];
