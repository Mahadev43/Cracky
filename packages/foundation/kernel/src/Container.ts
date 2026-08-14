/**
 * Kernel dependency-injection container.
 *
 * Scope, deliberately: register() + singleton() + resolve(), for singleton
 * and transient lifetimes. No decorators, no reflection, no child scopes —
 * those are not needed for the walking skeleton and can be added when a
 * real use case requires them, not before.
 */

export type ServiceToken<T = unknown> = string | symbol | (new (...args: never[]) => T);

export type ServiceLifetime = "singleton" | "transient";

export type ServiceFactory<T> = (container: Container) => T;

interface ServiceDescriptor<T = unknown> {
  readonly token: ServiceToken<T>;
  readonly factory: ServiceFactory<T>;
  readonly lifetime: ServiceLifetime;
}

function tokenName(token: ServiceToken): string {
  if (typeof token === "string") return token;
  if (typeof token === "symbol") return token.description ?? token.toString();
  return token.name;
}

export class Container {
  private readonly descriptors = new Map<ServiceToken, ServiceDescriptor>();
  private readonly singletons = new Map<ServiceToken, unknown>();
  private readonly resolutionStack: ServiceToken[] = [];

  /**
   * Register a factory for a token. Defaults to "singleton" — the common
   * case in the kernel — but a service can opt into "transient" (a new
   * instance per resolve()) by passing the lifetime explicitly.
   */
  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, lifetime: ServiceLifetime = "singleton"): this {
    if (this.descriptors.has(token)) {
      throw new Error(`Service already registered: ${tokenName(token)}`);
    }
    this.descriptors.set(token as ServiceToken, {
      token,
      factory: factory as ServiceFactory<unknown>,
      lifetime,
    });
    return this;
  }

  /**
   * Sugar for register(token, factory, "singleton") — reads better at call
   * sites that want to be explicit about the lifetime they mean.
   */
  singleton<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): this {
    return this.register(token, factory, "singleton");
  }

  /**
   * Register an already-constructed value as a singleton (e.g. config
   * objects, primitives) instead of a factory.
   */
  registerValue<T>(token: ServiceToken<T>, value: T): this {
    return this.singleton(token, () => value);
  }

  resolve<T>(token: ServiceToken<T>): T {
    const descriptor = this.descriptors.get(token) as ServiceDescriptor<T> | undefined;
    if (!descriptor) {
      throw new Error(`No service registered for: ${tokenName(token)}`);
    }

    if (this.resolutionStack.includes(token)) {
      const cycle = [...this.resolutionStack, token].map(tokenName).join(" -> ");
      throw new Error(`Circular dependency detected while resolving service: ${cycle}`);
    }

    if (descriptor.lifetime === "singleton") {
      if (this.singletons.has(token)) {
        return this.singletons.get(token) as T;
      }
      const instance = this.instantiate(token, descriptor);
      this.singletons.set(token, instance);
      return instance;
    }

    return this.instantiate(token, descriptor);
  }

  has(token: ServiceToken): boolean {
    return this.descriptors.has(token);
  }

  private instantiate<T>(token: ServiceToken<T>, descriptor: ServiceDescriptor<T>): T {
    this.resolutionStack.push(token);
    try {
      return descriptor.factory(this);
    } finally {
      this.resolutionStack.pop();
    }
  }
}
