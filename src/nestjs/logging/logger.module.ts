import { DynamicModule, Global, Module, ModuleMetadata } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { Logger } from 'pino';
import { getDefaultLogger } from '../../logging/index.js';
import { HEALTHCHECK_ENDPOINT } from '../healthcheck/index.js';

/**
 * Options for the {@link LoggerModule}.
 */
type ModuleOptions = {
  /**
   * The pino logger to use.
   * Defaults to `getDefaultLogger()`.
   */
  logger?: Logger;
};

/**
 * Creates the definition for the {@link LoggerModule}, configuring pino HTTP in the process.
 *
 * @param options Options for the {@link LoggerModule}.
 * @returns The {@link ModuleMetadata}.
 */
function createModuleMetadata(options: ModuleOptions = {}): ModuleMetadata {
  return {
    imports: [
      // Using an async factory function ensures the logger had the chance to be configured before it is used.
      PinoLoggerModule.forRootAsync({
        useFactory: () => ({
          pinoHttp: {
            // Passing the default logger ensures the default configuration is inherited...
            logger: options.logger ?? getDefaultLogger(),
            // ... the following only sets up pino-http specific settings.
            autoLogging: {
              ignore: (req) =>
                (req as any).originalUrl === `/${HEALTHCHECK_ENDPOINT}`,
            },
          },
        }),
      }),
    ],
  };
}

/**
 * This module exposes a ready-to-use logger for NestJS REST services in the form of the `PinoLogger`.
 */
@Global()
@Module(createModuleMetadata())
export class LoggerModule {
  /**
   * Creates a global {@link LoggerModule} that can be used by the entire application.
   *
   * @param options Options for the {@link LoggerModule}.
   * @returns The logger module.
   */
  static forRoot(options: ModuleOptions = {}): DynamicModule {
    return {
      module: LoggerModule,
      global: true,
      ...createModuleMetadata(options),
    };
  }
}
