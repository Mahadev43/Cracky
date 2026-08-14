import child_process from "node:child_process";
import os from "node:os";

export class OllamaInstaller {
  /**
   * Checks if the Ollama CLI is installed on the system.
   */
  isInstalled(): boolean {
    try {
      child_process.execSync("ollama --version", { stdio: "ignore", timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Attempts to install Ollama on the current OS.
   */
  async install(): Promise<void> {
    const platform = os.platform();

    if (platform === "linux") {
      console.log("\nCracky is attempting to install Ollama...");
      return new Promise((resolve, reject) => {
        const installProcess = child_process.spawn(
          "sh",
          ["-c", "curl -fsSL https://ollama.com/install.sh | sh"],
          { stdio: "inherit" }
        );

        installProcess.on("close", (code) => {
          if (code === 0) {
            console.log("\nOllama was installed successfully.");
            resolve();
          } else {
            reject(new Error(`Installation script exited with code ${code}`));
          }
        });

        installProcess.on("error", (err) => {
          reject(new Error(`Failed to spawn installation process: ${err.message}`));
        });
      });
    }

    if (platform === "darwin") {
      throw new Error(
        "Automatic installation is not supported on macOS.\n" +
        "Please download and install Ollama from: https://ollama.com/download/mac"
      );
    }

    if (platform === "win32") {
      throw new Error(
        "Automatic installation is not supported on Windows.\n" +
        "Please download and install Ollama from: https://ollama.com/download/windows"
      );
    }

    throw new Error(`Automatic installation is not supported on platform: ${platform}`);
  }
}
