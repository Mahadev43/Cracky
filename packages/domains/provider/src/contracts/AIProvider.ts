export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatRequest {
    model?: string;
    messages: ChatMessage[];
}

export interface ChatResponse {
    content: string;
}

export interface AIProvider {
    chat(request: ChatRequest): Promise<ChatResponse>;
}
