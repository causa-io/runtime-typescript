import {
  ClassSerializerInterceptor,
  INestApplication,
  Module,
  ModuleMetadata,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import { Logger } from 'nestjs-pino';
import { ExceptionFilterModule } from '../errors/index.js';
import { LoggerModule } from '../logging/index.js';
import { ValidationModule } from '../validation/index.js';

/**
 * The configuration for `body-parser` of the maximum size of input payloads when parsing JSON.
 */
const DEFAULT_PAYLOAD_LIMIT = '5mb';

/**
 * Creates the global module for a NestJS application.
 *
 * @param businessModule The module containing business logic.
 * @returns The module from which the NestJS application can be created.
 */
function createAppModule(businessModule: any): any {
  const imports: ModuleMetadata['imports'] = [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    ValidationModule,
    ExceptionFilterModule,
    businessModule,
  ];

  @Module({
    imports,
    providers: [
      { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    ],
  })
  class AppModule {}

  return AppModule;
}

/**
 * A function that takes a NestJS module and returns a NestJS application.
 */
export type AppFactory = (module: any) => Promise<INestApplication>;

/**
 * Options for the {@link createApp} function.
 */
export type CreateAppOptions = {
  /**
   * The function to use to create an application.
   * By default this uses `express`.
   */
  appFactory?: AppFactory;
};

/**
 * The default {@link AppFactory}, which uses `express`.
 */
export const DEFAULT_APP_FACTORY: AppFactory = async (appModule) => {
  const app = await NestFactory.create<NestExpressApplication>(appModule, {
    bufferLogs: true,
  });

  app.disable('x-powered-by');
  app.use(json({ limit: DEFAULT_PAYLOAD_LIMIT }));

  return app;
};

/**
 * Creates a NestJS express application from a module.
 * {@link createAppModule} is called on module, such that base functionalities (authentication, healthcheck) are added.
 *
 * @param businessModule The module from which the NestJS application will be created.
 * @param options Options when creating the application.
 * @returns The {@link INestApplication}.
 */
export async function createApp(
  businessModule: any,
  options: CreateAppOptions = {},
): Promise<INestApplication> {
  const appFactory = options.appFactory ?? DEFAULT_APP_FACTORY;

  const AppModule = createAppModule(businessModule);

  const app = await appFactory(AppModule);

  const logger = app.get(Logger);

  app.useLogger(logger);
  app.useGlobalPipes();
  app.enableShutdownHooks();

  await app.init();

  return app;
}
