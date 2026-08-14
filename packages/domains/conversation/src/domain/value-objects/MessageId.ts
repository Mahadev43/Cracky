import { randomUUID } from "node:crypto";

export class MessageId {
  private constructor(public readonly value: string) {}

  static generate(): MessageId {
    return new MessageId(randomUUID());
  }

  static from(value: string): MessageId {
    if (!value) {
      throw new Error("MessageId cannot be empty");
    }
    return new MessageId(value);
  }

  equals(other: MessageId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
