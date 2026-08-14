import { randomUUID } from "node:crypto";

/**
 * Aggregate v3 §2 — value object. Immutable, compared by value (its
 * wrapped string), never mutated in place.
 */
export class ConversationId {
  private constructor(public readonly value: string) {}

  static generate(): ConversationId {
    return new ConversationId(randomUUID());
  }

  static from(value: string): ConversationId {
    if (!value) {
      throw new Error("ConversationId cannot be empty");
    }
    return new ConversationId(value);
  }

  equals(other: ConversationId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
