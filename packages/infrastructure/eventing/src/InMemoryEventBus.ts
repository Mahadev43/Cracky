import type { DomainEvent } from "./Event.js";
import type { EventBus, EventHandler, Unsubscribe } from "./EventBus.js";

export interface InMemoryEventBusOptions {
  /**
   * Called when a subscriber throws or rejects. Defaults to console.error
   * so failures are visible instead of silently dropped — swap this for
   * a real Logger port once the Observability context exists (v2 §15).
   */
  onHandlerError?: (error: unknown, event: DomainEvent) => void;
}

const defaultOnHandlerError: NonNullable<InMemoryEventBusOptions["onHandlerError"]> = (error, event) => {
  console.error(`[EventBus] subscriber for "${event.type}" failed:`, error);
};

/**
 * The Local (laptop) / self-hosted implementation of the Event Bus port
 * (architecture v1/v2 — "Event Bus" as the kernel's pub/sub backbone).
 * A durable broker (NATS/Kafka) adapter is a drop-in replacement behind
 * the same EventBus interface once the Enterprise topology needs it.
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly onHandlerError: NonNullable<InMemoryEventBusOptions["onHandlerError"]>;

  constructor(options: InMemoryEventBusOptions = {}) {
    this.onHandlerError = options.onHandlerError ?? defaultOnHandlerError;
  }

  publish(event: DomainEvent): void {
    const subscribers = this.handlers.get(event.type);
    if (!subscribers) return;
    for (const handler of subscribers) {
      // Wrapping the call itself in Promise.resolve().then() — not just
      // awaiting the result — is what catches a *synchronous* throw too,
      // not only a rejected promise. Errors go to onHandlerError, never
      // back to publish()'s caller: a broken subscriber must not be able
      // to make an already-committed write (v3 §5) look like it failed.
      Promise.resolve()
        .then(() => handler(event))
        .catch((error: unknown) => this.onHandlerError(error, event));
    }
  }

  async publishAndWait(event: DomainEvent): Promise<void> {
    const subscribers = this.handlers.get(event.type);
    if (!subscribers) return;
    // Same isolation guarantee as publish(): each handler is awaited, but
    // a rejection/throw is caught per-handler and routed to
    // onHandlerError rather than propagated — callers that need to know
    // "did the subscribers finish" can await this without also taking on
    // "did every subscriber succeed".
    await Promise.all(
      [...subscribers].map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          this.onHandlerError(error, event);
        }
      }),
    );
  }

  subscribe<Payload = unknown>(eventType: string, handler: EventHandler<Payload>): Unsubscribe {
    const set = this.handlers.get(eventType) ?? new Set<EventHandler>();
    set.add(handler as EventHandler);
    this.handlers.set(eventType, set);
    return () => this.unsubscribe(eventType, handler as EventHandler);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }
}
