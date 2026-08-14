import type { AIProvider, ChatRequest, ChatResponse } from "@cracky-ai/domains-provider";

/**
 * The AI orchestration layer.
 * Knows nothing about HTTP or specific LLM implementations.
 * It only depends on the AIProvider interface.
 */
export class AIService {
    constructor(private readonly provider: AIProvider) {}

    /**
     * Sends a chat request to the configured AI provider.
     * Could be expanded to handle prompt injection, retries, history truncation, etc.
     */
    async chat(request: ChatRequest): Promise<ChatResponse> {
        return this.provider.chat(request);
    }
}
