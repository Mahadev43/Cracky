/**
 * Base shape for every domain/application/infrastructure event on the bus
 * (see architecture v3 §3 — the event catalog). `type` is the stable,
 * versionable name (e.g. "conversation.message-added.v1"); `payload` is
 * whatever that event's schema defines.
 */
export interface DomainEvent<Payload = unknown> {
  readonly type: string;
  readonly occurredAt: Date;
  readonly payload: Payload;
}

export function createEvent<Payload>(type: string, payload: Payload): DomainEvent<Payload> {
  return { type, occurredAt: new Date(), payload };
}
