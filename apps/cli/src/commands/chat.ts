import { createInterface } from "node:readline/promises";
import { bootstrap } from "@cracky-ai/foundation-kernel";
import {
  InMemoryEventBus,
  type EventBus,
} from "@cracky-ai/infrastructure-eventing";
import {
  ConversationId,
  ConversationService,
  type ConversationRepository,
} from "@cracky-ai/domains-conversation";
import { InMemoryConversationRepository } from "@cracky-ai/infrastructure-storage-memory";
import {
  applyInitialSchema,
  openDatabase,
  SqliteConversationRepository,
} from "@cracky-ai/infrastructure-storage-sqlite";
import { AIService } from "@cracky-ai/domains-ai";
import type { AIProvider } from "@cracky-ai/domains-provider";
import { OllamaProvider } from "@cracky-ai/provider-ollama";
import type { DatabaseSync } from "node:sqlite";
import { LocalAIManager } from "../local-ai/LocalAIManager.js";
import { HardwareDetector } from "../local-ai/HardwareDetector.js";
import { ModelSelector } from "../local-ai/ModelSelector.js";

const EVENT_BUS = "EventBus";
const CONVERSATION_REPOSITORY = "ConversationRepository";
const CONVERSATION_SERVICE = "ConversationService";
const AI_PROVIDER = "AIProvider";
const AI_SERVICE = "AIService";

type MessageAddedPayload = {
  conversationId: string;
  messageId: string;
  role: "system" | "user" | "assistant";
};

type EventWithMessagePayload = {
  payload: MessageAddedPayload;
};

export async function runChat(): Promise<void> {
  const storageBackend =
    process.env.CRACKY_STORAGE === "memory" ? "memory" : "sqlite";

  const dbPath = process.env.CRACKY_DB ?? "./cracky.db";
  let ollamaModel = process.env.CRACKY_MODEL;

  let db: DatabaseSync | undefined;

  console.log("\nCracky AI v0.1\n");

  if (!ollamaModel) {
    console.log("Detecting system hardware...");
    const detector = new HardwareDetector();
    const profile = await detector.detect();
    
    console.log(`OS: ${profile.platform} ${profile.architecture}`);
    console.log(`CPU: ${profile.cpu.model} (${profile.cpu.cores} cores)`);
    console.log(`RAM: ${(profile.memory.totalBytes / 1024 ** 3).toFixed(1)} GB`);
    if (profile.gpu) {
      console.log(`GPU: ${profile.gpu.vendor} ${profile.gpu.model} (${(profile.gpu.vramBytes / 1024 ** 3).toFixed(1)} GB VRAM)`);
    } else {
      console.log(`GPU: Not detected or unknown`);
    }
    console.log(`Storage: ${(profile.storage.availableBytes / 1024 ** 3).toFixed(1)} GB available`);

    try {
      const selector = new ModelSelector();
      const selectedModelProfile = selector.select(profile);
      ollamaModel = selectedModelProfile.name;
      console.log(`\nSelected Model: ${ollamaModel}`);
      
      if (profile.storage.availableBytes < selectedModelProfile.approximateDiskBytes) {
        throw new Error(`Insufficient storage for ${ollamaModel}`);
      }
    } catch (e) {
      console.error(`\n✗ Error selecting model: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  } else {
    console.log(`Using manually specified model: ${ollamaModel}`);
  }

  const localAI = new LocalAIManager();
  
  try {
    await localAI.prepareEnvironment(ollamaModel);
  } catch (error) {
    console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
    localAI.shutdown();
    process.exit(1);
  }

  /*
   * bootstrap() already starts the application.
   * Do NOT call app.start() again.
   */
  const app = await bootstrap((builder) => {
    builder.registerValue(
      EVENT_BUS,
      new InMemoryEventBus(),
    );

    builder.register<ConversationRepository>(
      CONVERSATION_REPOSITORY,
      () => {
        if (storageBackend === "memory") {
          return new InMemoryConversationRepository();
        }

        db = openDatabase(dbPath);
        applyInitialSchema(db);

        return new SqliteConversationRepository(db);
      },
    );

    builder.register(
      CONVERSATION_SERVICE,
      (container) =>
        new ConversationService(
          container.resolve(CONVERSATION_REPOSITORY),
          container.resolve(EVENT_BUS),
        ),
    );

    builder.registerValue<AIProvider>(
      AI_PROVIDER,
      new OllamaProvider(),
    );

    builder.register(
      AI_SERVICE,
      (container) =>
        new AIService(
          container.resolve(AI_PROVIDER),
        ),
    );

    builder.addLifecycleHook({
      name: "storage",

      start: () => {},

      stop: () => {
        db?.close();
      },
    });
  });

  const conversationService =
    app.resolve<ConversationService>(
      CONVERSATION_SERVICE,
    );

  const eventBus =
    app.resolve<EventBus>(EVENT_BUS);

  const aiService =
    app.resolve<AIService>(AI_SERVICE);

  /*
   * Handle conversation.message-added.v1 events.
   */
  eventBus.subscribe(
    "conversation.message-added.v1",
    async (event: EventWithMessagePayload) => {
      const payload = event.payload;

      /*
       * User message:
       *
       * 1. Load conversation
       * 2. Get conversation history
       * 3. Send history to Ollama
       * 4. Save AI response
       */
      if (payload.role === "user") {
        const conversation =
          await conversationService.getConversation(
            ConversationId.from(
              payload.conversationId,
            ),
          );

        if (!conversation) {
          return;
        }

        const turns = conversation
          .getMessages()
          .map((message) => ({
            role: message.role,
            content: message.getContent(),
          }));

        try {
          const response = await aiService.chat({
            model: ollamaModel,
            messages: turns,
          });

          if (response.content.trim()) {
            await conversationService.sendMessage(
              conversation.id,
              "assistant",
              response.content,
            );
          }
        } catch (error) {
          console.error(
            `\n[AI Error: ${
              error instanceof Error
                ? error.message
                : String(error)
            }]\n`,
          );
        }

        return;
      }

      /*
       * Assistant message:
       * Find the newly-created message and display it.
       */
      if (payload.role === "assistant") {
        const conversation =
          await conversationService.getConversation(
            ConversationId.from(
              payload.conversationId,
            ),
          );

        if (!conversation) {
          return;
        }

        const latest = conversation
          .getMessages()
          .find(
            (message) =>
              message.id.value ===
              payload.messageId,
          );

        if (latest) {
          console.log(
            `\nAI:\n${latest.getContent()}\n`,
          );
        }
      }
    },
  );

  const conversation =
    await conversationService.startConversation(
      "CLI Session",
    );

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      const input = (
        await rl.question("> ")
      ).trim();

      if (!input) {
        continue;
      }

      if (
        input === "exit" ||
        input === "quit"
      ) {
        break;
      }

      await conversationService.sendMessage(
        conversation.id,
        "user",
        input,
      );
    }
  } finally {
    rl.close();

    /*
     * Application uses shutdown(), not stop().
     */
    await app.shutdown();
    localAI.shutdown();
  }
}