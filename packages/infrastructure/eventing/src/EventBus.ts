import type { DomainEvent } from "./Event.js";

export type EventHandler<Payload = unknown> = (event: DomainEvent<Payload>) => void | Promise<void>;

export type Unsubscribe = () => void;

export interface EventBus {
  /**
   * Fire-and-forget publish. Handlers run asynchronously; the returned
   * promise (if any) resolves once handlers have been scheduled, not once
   * they've finished. A failing subscriber never rejects this call and
   * never affects the caller that just committed a successful write.
   */
  publish(event: DomainEvent): Promise<void> | void;

  /**
   * Publish and wait for every subscriber to finish (or fail) before
   * resolving. Still isolates handler errors — a failing subscriber is
   * reported via the bus's error channel, not thrown back to the caller —
   * so awaiting this never turns a successful save into a failed request.
   */
  publishAndWait(event: DomainEvent): Promise<void>;

  subscribe<Payload = unknown>(eventType: string, handler: EventHandler<Payload>): Unsubscribe;
  unsubscribe(eventType: string, handler: EventHandler): void;
}
