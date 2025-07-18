import type { DynamicModule, ModuleMetadata } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { Logger } from 'pino';
import { getDefaultLogger } from '../../logging/index.js';
import { HEALTHCHECK_ENDPOINT } from '../healthcheck/index.js';

/**
 * The NestJS injection token for the {@link LoggerModuleOptions}.
 * Used by testing utilities.
 */
export const LOGGER_MODULE_OPTIONS_INJECTION_TOKEN =
  'CAUSA_LOGGER_MODULE_OPTIONS';

/**
 * Options for the {@link LoggerModule}.
 */
type LoggerModuleOptions = {
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
function createModuleMetadata(
  options: LoggerModuleOptions = {},
): ModuleMetadata {
  return {
    providers: [
      { provide: LOGGER_MODULE_OPTIONS_INJECTION_TOKEN, useValue: options },
    ],
    exports: [LOGGER_MODULE_OPTIONS_INJECTION_TOKEN],
    imports: [
      // Using an async factory function ensures the logger had the chance to be configured before it is used.
      PinoLoggerModule.forRootAsync({
        useFactory: (options: LoggerModuleOptions) => ({
          assignResponse: true,
          pinoHttp: {
            // Passing the default logger ensures the default configuration is inherited...
            logger: options.logger ?? getDefaultLogger(),
            // ... the following only sets up pino-http specific settings.
            autoLogging: {
              ignore: (req) =>
                (req as any).originalUrl === `/${HEALTHCHECK_ENDPOINT}`,
            },
            customSuccessMessage: () => 'request completed',
            customErrorMessage: () => 'request completed',
          },
        }),
        inject: [LOGGER_MODULE_OPTIONS_INJECTION_TOKEN],
      }),
    ],
  };
}

/**
 * This module exposes a ready-to-use logger for NestJS REST services in the form of the `PinoLogger`.
 */
export class LoggerModule {
  /**
   * Creates a global {@link LoggerModule} that can be used by the entire application.
   *
   * @param options Options for the {@link LoggerModule}.
   * @returns The logger module.
   */
  static forRoot(options: LoggerModuleOptions = {}): DynamicModule {
    return {
      module: LoggerModule,
      global: true,
      ...createModuleMetadata(options),
    };
  }
}
