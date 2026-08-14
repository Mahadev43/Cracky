import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResult,
  ModelProvider,
} from "@cracky-ai/domains-ai";

export interface OllamaClientOptions {
  /** Defaults to the standard local Ollama endpoint. */
  baseUrl?: string;
}

interface OllamaChatResponseLine {
  message?: { content?: string };
  done?: boolean;
}

/**
 * Adapter implementing the ModelProvider port for Ollama. This is the
 * "first concrete provider" in the walking skeleton — its whole job is
 * translating between Ollama's HTTP/NDJSON API and the vendor-neutral
 * ModelProvider contract. Nothing above this file (ChatService, CLI)
 * knows Ollama exists.
 */
export class OllamaClient implements ModelProvider {
  readonly name = "ollama";
  private readonly baseUrl: string;

  constructor(options: OllamaClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "http://localhost:11434";
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    let content = "";
    for await (const chunk of this.chatStream(request)) {
      content += chunk.content;
    }
    return { content };
  }

  async *chatStream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line) as OllamaChatResponseLine;
          yield {
            content: parsed.message?.content ?? "",
            done: parsed.done ?? false,
          };
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
