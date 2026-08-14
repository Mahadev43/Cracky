import { Container, type ServiceToken } from "./Container.js";

export type ApplicationStatus = "stopped" | "starting" | "running" | "stopping";

/**
 * Something the Application needs to start before it's ready and stop
 * cleanly on shutdown — an event bus subscription, a database connection,
 * a background worker. Modules register hooks; the Application sequences
 * them: registration order on start, reverse order on shutdown (last
 * started, first stopped) — the standard shutdown-safety ordering.
 */
export interface LifecycleHook {
  readonly name: string;
  start(): Promise<void> | void;
  stop(): Promise<void> | void;
}

/**
 * The Core Kernel's boot surface: a service container plus lifecycle
 * sequencing, wired together. Nothing in this class knows about
 * Conversation, AI, or any other bounded context — modules register
 * themselves via ApplicationBuilder before start() is called.
 */
export class Application {
  private status: ApplicationStatus = "stopped";
  private readonly startedHooks: LifecycleHook[] = [];

  constructor(
    private readonly container: Container,
    private readonly hooks: readonly LifecycleHook[] = [],
  ) {}

  resolve<T>(token: ServiceToken<T>): T {
    return this.container.resolve(token);
  }

  async start(): Promise<void> {
    if (this.status !== "stopped") {
      throw new Error(`Cannot start application from status "${this.status}"`);
    }
    this.status = "starting";
    for (const hook of this.hooks) {
      await hook.start();
      this.startedHooks.push(hook);
    }
    this.status = "running";
  }

  async shutdown(): Promise<void> {
    if (this.status !== "running") {
      throw new Error(`Cannot shut down application from status "${this.status}"`);
    }
    this.status = "stopping";
    const errors: unknown[] = [];
    for (const hook of [...this.startedHooks].reverse()) {
      try {
        await hook.stop();
      } catch (error) {
        errors.push(error);
      }
    }
    this.startedHooks.length = 0;
    this.status = "stopped";
    if (errors.length > 0) {
      throw new AggregateError(errors, "One or more lifecycle hooks failed to stop cleanly");
    }
  }

  getStatus(): ApplicationStatus {
    return this.status;
  }
}
