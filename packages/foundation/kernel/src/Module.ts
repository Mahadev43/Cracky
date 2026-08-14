import type { ApplicationBuilder } from "./ApplicationBuilder.js";

/**
 * A Module is how a bounded context plugs its services and lifecycle hooks
 * into the kernel at boot time, without the kernel needing to know that
 * context exists. Conversation, Storage, and every future domain each
 * expose one of these instead of the kernel importing them directly.
 */
export interface Module {
  readonly name: string;
  register(builder: ApplicationBuilder): void;
}
