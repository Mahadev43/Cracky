import { OllamaInstaller } from "./OllamaInstaller.js";
import { OllamaRuntime } from "./OllamaRuntime.js";

export class LocalAIManager {
  private installer: OllamaInstaller;
  private runtime: OllamaRuntime;

  constructor(
    installer = new OllamaInstaller(),
    runtime = new OllamaRuntime()
  ) {
    this.installer = installer;
    this.runtime = runtime;
  }

  /**
   * Prepares the local AI environment by ensuring Ollama is installed,
   * running, and the requested model is available.
   */
  async prepareEnvironment(model: string): Promise<void> {
    process.stdout.write("Checking local AI environment...\n");

    if (!this.installer.isInstalled()) {
      await this.installer.install();
    }
    process.stdout.write("✓ Ollama installed\n");

    const isRunning = await this.runtime.isRunning();
    if (!isRunning) {
      this.runtime.start();
      try {
        await this.runtime.waitUntilReady(15000);
      } catch (err) {
        throw new Error(`Could not start Ollama. ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    process.stdout.write("✓ Ollama running\n");

    const hasModel = await this.runtime.hasModel(model);
    if (!hasModel) {
      await this.runtime.pullModel(model);
    }
    process.stdout.write(`✓ Model ${model} ready\n`);
  }

  /**
   * Terminates the Ollama server only if we started it.
   */
  shutdown(): void {
    this.runtime.shutdown();
  }
}
