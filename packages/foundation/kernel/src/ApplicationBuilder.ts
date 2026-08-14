import { Application, type LifecycleHook } from "./Application.js";
import { Container, type ServiceFactory, type ServiceLifetime, type ServiceToken } from "./Container.js";
import type { Module } from "./Module.js";

/**
 * Fluent configuration surface used while assembling an Application:
 * register services, register lifecycle hooks, mount modules. Nothing is
 * live until build() hands back an Application, and nothing runs until
 * that Application's start() is called.
 */
export class ApplicationBuilder {
  private readonly container = new Container();
  private readonly hooks: LifecycleHook[] = [];
  private readonly registeredModules = new Set<string>();

  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, lifetime: ServiceLifetime = "singleton"): this {
    this.container.register(token, factory, lifetime);
    return this;
  }

  singleton<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): this {
    this.container.singleton(token, factory);
    return this;
  }

  registerValue<T>(token: ServiceToken<T>, value: T): this {
    this.container.registerValue(token, value);
    return this;
  }

  addLifecycleHook(hook: LifecycleHook): this {
    this.hooks.push(hook);
    return this;
  }

  addModule(module: Module): this {
    if (this.registeredModules.has(module.name)) {
      throw new Error(`Module already registered: ${module.name}`);
    }
    this.registeredModules.add(module.name);
    module.register(this);
    return this;
  }

  build(): Application {
    return new Application(this.container, this.hooks);
  }
}
