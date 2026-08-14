import type { EventBus } from "@cracky-ai/infrastructure-eventing";
import { Conversation } from "../../domain/aggregates/Conversation.js";
import type { Message, MessageRole } from "../../domain/entities/Message.js";
import type { ConversationRepository } from "../../domain/repositories/ConversationRepository.js";
import { ConversationId } from "../../domain/value-objects/ConversationId.js";

export class ConversationNotFoundError extends Error {
  constructor(id: ConversationId) {
    super(`Conversation not found: ${id.value}`);
    this.name = "ConversationNotFoundError";
  }
}

/**
 * Application service (v2 §2 / v3 §1): orchestrates the use case, holds
 * no business rules of its own (those live on the Conversation aggregate),
 * and enforces the Unit-of-Work ordering — repository.save() commits
 * first, domain events are published only after that succeeds.
 */
export class ConversationService {
  constructor(
    private readonly repository: ConversationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async startConversation(title: string | null = null): Promise<Conversation> {
    const conversation = Conversation.create(title);
    await this.repository.save(conversation);
    await this.publishPendingEvents(conversation);
    return conversation;
  }

  async sendMessage(conversationId: ConversationId, role: MessageRole, content: string): Promise<Message> {
    const conversation = await this.repository.findById(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    const message = conversation.addMessage(role, content);
    await this.repository.save(conversation);
    await this.publishPendingEvents(conversation);
    return message;
  }

  async getConversation(conversationId: ConversationId): Promise<Conversation | null> {
    return this.repository.findById(conversationId);
  }

  private async publishPendingEvents(conversation: Conversation): Promise<void> {
    for (const event of conversation.pullEvents()) {
      await this.eventBus.publish(event);
    }
  }
}
