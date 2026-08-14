import { ConversationId } from "../value-objects/ConversationId.js";
import { MessageId } from "../value-objects/MessageId.js";

export type MessageRole = "system" | "user" | "assistant";

/**
 * Entity (v3 §2) — has identity, lives inside the Conversation aggregate,
 * can be edited independently of the aggregate's other messages.
 */
export class Message {
  private constructor(
    public readonly id: MessageId,
    public readonly conversationId: ConversationId,
    public readonly role: MessageRole,
    private content: string,
    public readonly createdAt: Date,
    private editedAt: Date | null = null,
  ) {}

  static create(conversationId: ConversationId, role: MessageRole, content: string): Message {
    if (content.trim().length === 0) {
      throw new Error("Message content cannot be empty");
    }
    return new Message(MessageId.generate(), conversationId, role, content, new Date());
  }

  /** Reconstitutes a Message from persisted data — no new identity, no validation-as-creation. */
  static reconstitute(
    id: MessageId,
    conversationId: ConversationId,
    role: MessageRole,
    content: string,
    createdAt: Date,
    editedAt: Date | null,
  ): Message {
    return new Message(id, conversationId, role, content, createdAt, editedAt);
  }

  getContent(): string {
    return this.content;
  }

  getEditedAt(): Date | null {
    return this.editedAt;
  }

  edit(content: string): void {
    if (content.trim().length === 0) {
      throw new Error("Message content cannot be empty");
    }
    this.content = content;
    this.editedAt = new Date();
  }
}
