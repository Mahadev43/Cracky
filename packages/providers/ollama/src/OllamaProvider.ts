/// <reference lib="dom" />
import type { AIProvider, ChatRequest, ChatResponse } from "@cracky-ai/domains-provider";

export interface OllamaProviderOptions {
    baseUrl?: string;
}

export class OllamaProvider implements AIProvider {
    private readonly baseUrl: string;

    constructor(options: OllamaProviderOptions = {}) {
        this.baseUrl = options.baseUrl ?? "http://localhost:11434";
    }

    async chat(request: ChatRequest): Promise<ChatResponse> {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                model: request.model ?? "qwen2.5:1.5b",
                messages: request.messages,
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return {
            content: data.message?.content ?? "",
        };
    }
}
