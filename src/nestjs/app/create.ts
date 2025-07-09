import {
  ClassSerializerInterceptor,
  type INestApplication,
  Module,
  type ModuleMetadata,
  type NestApplicationOptions,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { ExceptionFilterModule } from '../errors/index.js';
import { LoggerModule } from '../logging/index.js';
import { ValidationModule } from '../validation/index.js';

/**
 * Creates the global module for a NestJS application.
 *
 * @param businessModule The module containing business logic.
 * @returns The module from which the NestJS application can be created.
 */
export function createAppModule(businessModule: any): any {
  const imports: ModuleMetadata['imports'] = [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(),
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
 * Options for the {@link createApp} function.
 */
export type CreateAppOptions<T extends INestApplication = INestApplication> = {
  /**
   * Options to pass to the {@link CreateAppOptions.appFactory}, then forwarded to the {@link NestFactory.create} call.
   */
  nestApplicationOptions?: NestApplicationOptions;

  /**
   * A function that applies extra configuration to the Nest application.
   */
  extraConfiguration?: (app: T) => void;
};

/**
 * Creates a NestJS express application from a module.
 * {@link createAppModule} is called on module, such that base functionalities (authentication, healthcheck) are added.
 *
 * @param businessModule The module from which the NestJS application will be created.
 * @param options Options when creating the application.
 * @returns The {@link INestApplication}.
 */
export async function createApp<T extends INestApplication = INestApplication>(
  businessModule: any,
  options: CreateAppOptions<T> = {},
): Promise<INestApplication> {
  const appModule = createAppModule(businessModule);

  const app = await NestFactory.create<NestExpressApplication>(appModule, {
    bufferLogs: true,
    ...options.nestApplicationOptions,
  });

  if (options.extraConfiguration) {
    options.extraConfiguration(app as any);
  }

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.flushLogs();
  app.enableShutdownHooks();
  app.disable('x-powered-by');

  await app.init();

  return app;
}
