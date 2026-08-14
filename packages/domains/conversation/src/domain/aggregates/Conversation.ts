import type { DomainEvent } from "@cracky-ai/infrastructure-eventing";
import { Message, type MessageRole } from "../entities/Message.js";
import { ConversationId } from "../value-objects/ConversationId.js";
import { MessageId } from "../value-objects/MessageId.js";
import { conversationCreated, messageAdded } from "../events/ConversationEvents.js";

/**
 * Aggregate root (v3 §4 defines its identity; this is the implementation).
 * Owns Message entities and their invariants. Mutations raise domain
 * events into an internal buffer — the Application layer pulls and
 * publishes them only after the repository commit succeeds (v3 §5,
 * Unit of Work: events after commit, never before).
 */
export class Conversation {
  private readonly messages: Message[] = [];
  private readonly pendingEvents: DomainEvent[] = [];
  private archivedAt: Date | null = null;

  private constructor(
    public readonly id: ConversationId,
    private title: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(title: string | null = null): Conversation {
    const conversation = new Conversation(ConversationId.generate(), title, new Date());
    conversation.pendingEvents.push(conversationCreated(conversation.id, title));
    return conversation;
  }

  /** Reconstitutes an existing Conversation from persisted state — raises no events. */
  static reconstitute(
    id: ConversationId,
    title: string | null,
    createdAt: Date,
    archivedAt: Date | null,
    messages: Message[],
  ): Conversation {
    const conversation = new Conversation(id, title, createdAt);
    conversation.archivedAt = archivedAt;
    conversation.messages.push(...messages);
    return conversation;
  }

  getTitle(): string | null {
    return this.title;
  }

  getMessages(): readonly Message[] {
    return this.messages;
  }

  isArchived(): boolean {
    return this.archivedAt !== null;
  }

  addMessage(role: MessageRole, content: string): Message {
    if (this.isArchived()) {
      throw new Error(`Cannot add a message to archived conversation ${this.id.value}`);
    }
    const message = Message.create(this.id, role, content);
    this.messages.push(message);
    this.pendingEvents.push(messageAdded(this.id, message.id, role));
    return message;
  }

  archive(): void {
    if (this.isArchived()) return;
    this.archivedAt = new Date();
  }

  /** Drains and returns events raised since the last pull — call once, after commit. */
  pullEvents(): DomainEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents.length = 0;
    return events;
  }
}
