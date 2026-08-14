#!/usr/bin/env node
import { runChat } from "./commands/chat.js";

const [, , command] = process.argv;

async function main(): Promise<void> {
  switch (command) {
    case "chat":
      await runChat();
      break;
    case undefined:
    case "help":
    case "--help":
      printUsage();
      break;
    default:
      console.error(`Unknown command: "${command}"\n`);
      printUsage();
      process.exitCode = 1;
  }
}

function printUsage(): void {
  console.log(`cracky — Cracky AI CLI

Usage:
  cracky chat    Start an interactive chat session

Environment:
  CRACKY_STORAGE   "sqlite" (default) or "memory"
  CRACKY_DB        path to the SQLite file (default: ./cracky.db)
  CRACKY_MODEL     model name to request from Ollama (default: qwen2.5:1.5b)
`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
