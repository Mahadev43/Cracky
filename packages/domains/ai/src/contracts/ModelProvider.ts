/**
 * The Port every model provider adapter implements — Ollama first
 * (packages/providers/ollama), OpenAI/Anthropic/etc. later, all behind
 * this same contract. The AI domain (ChatService and friends) depends
 * only on this interface, never on a vendor SDK. This is the "Domain →
 * Provider Contracts → Provider Package → HTTP" chain from the
 * architecture review, made concrete.
 */

export type ChatRole = "system" | "user" | "assistant";

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatTurn[];
}

export interface ChatCompletionResult {
  content: string;
}

export interface ChatCompletionChunk {
  content: string;
  done: boolean;
}

export interface ModelProvider {
  readonly name: string;
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
  chatStream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
}
