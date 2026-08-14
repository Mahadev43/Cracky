import { Application } from "./Application.js";
import { ApplicationBuilder } from "./ApplicationBuilder.js";

export type BootstrapConfigurator = (builder: ApplicationBuilder) => void;

/**
 * Convenience entry point for apps (CLI, server): configure modules and
 * services, get back a started Application ready to resolve() services
 * from.
 *
 *   const app = await bootstrap((builder) => {
 *     builder.addModule(conversationModule);
 *   });
 *   const service = app.resolve(ConversationServiceToken);
 *
 * configure is optional — bootstrap() with no arguments still builds and
 * starts an (empty) Application.
 */
export async function bootstrap(configure?: BootstrapConfigurator): Promise<Application> {
  const builder = new ApplicationBuilder();
  configure?.(builder);
  const app = builder.build();
  await app.start();
  return app;
}
