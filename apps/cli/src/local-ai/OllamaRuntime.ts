import child_process, { type ChildProcess } from "node:child_process";

export class OllamaRuntime {
  private childProcess: ChildProcess | null = null;
  private readonly baseUrl = "http://127.0.0.1:11434";
  private startedByUs = false;

  /**
   * Checks if the Ollama API is currently responding.
   */
  async isRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(2000), // timeout if hung
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Starts the Ollama server and tracks the process.
   */
  start(): void {
    if (this.childProcess) {
      return; // Already started by us
    }

    this.startedByUs = true;
    
    // Spawn in background, ignore stdio to not pollute the CLI output
    this.childProcess = child_process.spawn("ollama", ["serve"], {
      stdio: "ignore",
      detached: false, // Tie to current process lifecycle
    });

    this.childProcess.on("error", (err) => {
      console.error(`\n[Local AI] Failed to start Ollama: ${err.message}`);
    });
  }

  /**
   * Waits until the Ollama API is responding, polling every 500ms.
   */
  async waitUntilReady(timeoutMs = 15000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await this.isRunning()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    
    throw new Error("Timeout waiting for Ollama to become ready");
  }

  /**
   * Checks if a specific model is already downloaded.
   */
  async hasModel(model: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok) return false;
      
      const data = await response.json() as { models?: Array<{ name: string; model: string }> };
      if (!data.models) return false;

      return data.models.some((m) => m.name === model || m.model === model);
    } catch {
      return false;
    }
  }

  /**
   * Pulls the specified model, printing progress to the console.
   */
  async pullModel(model: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`\nModel ${model} is not installed.\nDownloading model... (this may take a while)`);
      const pullProcess = child_process.spawn("ollama", ["pull", model], {
        stdio: "inherit", // Let the user see the progress
      });

      pullProcess.on("close", (code) => {
        if (code === 0) {
          console.log("\nModel ready.");
          resolve();
        } else {
          reject(new Error(`Failed to pull model ${model} (exit code ${code})`));
        }
      });

      pullProcess.on("error", (err) => {
        reject(new Error(`Failed to start model pull: ${err.message}`));
      });
    });
  }

  /**
   * Terminates the Ollama server only if we started it.
   */
  shutdown(): void {
    if (this.startedByUs && this.childProcess) {
      try {
        this.childProcess.kill("SIGTERM");
      } catch {
        // Ignore errors during kill
      }
      this.childProcess = null;
      this.startedByUs = false;
    }
  }
}
