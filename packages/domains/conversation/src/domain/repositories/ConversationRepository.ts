import type { Conversation } from "../aggregates/Conversation.js";
import type { ConversationId } from "../value-objects/ConversationId.js";

/**
 * The contract, per the storage-abstraction discussion: this interface
 * lives in the domain layer and returns/accepts domain entities only —
 * never SQL rows, driver types, or anything storage-specific. Adapters
 * (in-memory, SQLite, later Postgres) implement this and do the
 * translation; the domain never knows which one is in use.
 */
export interface ConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: ConversationId): Promise<Conversation | null>;
  delete(id: ConversationId): Promise<void>;
}
