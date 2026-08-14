import { createEvent, type DomainEvent } from "@cracky-ai/infrastructure-eventing";
import type { ConversationId } from "../value-objects/ConversationId.js";
import type { MessageId } from "../value-objects/MessageId.js";
import type { MessageRole } from "../entities/Message.js";

/**
 * Conversation context's entries in the domain event catalog (v3 §3, now
 * versioned per v4 §5). These are published by ConversationDomainService
 * only after the Unit of Work commits (v3 §5) — never before.
 */

export interface ConversationCreatedPayload {
  conversationId: string;
  title: string | null;
}

export function conversationCreated(id: ConversationId, title: string | null): DomainEvent<ConversationCreatedPayload> {
  return createEvent("conversation.created.v1", { conversationId: id.value, title });
}

export interface MessageAddedPayload {
  conversationId: string;
  messageId: string;
  role: MessageRole;
}

export function messageAdded(
  conversationId: ConversationId,
  messageId: MessageId,
  role: MessageRole,
): DomainEvent<MessageAddedPayload> {
  return createEvent("conversation.message-added.v1", {
    conversationId: conversationId.value,
    messageId: messageId.value,
    role,
  });
}
