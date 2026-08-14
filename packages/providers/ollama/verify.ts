import { OllamaProvider } from "./src/OllamaProvider.ts";

async function run() {
    const provider = new OllamaProvider();
    
    console.log("Sending chat request to Ollama...");
    try {
        const response = await provider.chat({
            model: "llama3", // Assuming user has llama3 or some default
            messages: [{ role: "user", content: "Hello, just say exactly 'pong' and nothing else." }]
        });
        console.log("Response:", response.content);
    } catch (err) {
        console.error("Failed to connect or get response:", err);
    }
}

run();
