import { Global, Logger, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { getDefaultLogger } from '../../logging/index.js';
import { HEALTHCHECK_ENDPOINT } from '../healthcheck/index.js';

/**
 * This module exposes a ready-to-use logger for NestJS REST services. It can be imported in the application module such
 * that the `Logger` dependency can be injected into any module.
 */
@Global()
@Module({
  imports: [
    // Using an async factory function ensures the logger had the chance to be configured before it is used.
    PinoLoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          // Passing the default logger ensures the default configuration is inherited...
          logger: getDefaultLogger(),
          // ... the following only sets up pino-http specific settings.
          autoLogging: {
            ignore: (req) =>
              (req as any).originalUrl === `/${HEALTHCHECK_ENDPOINT}`,
          },
          redact: { paths: ['req.headers.authorization'] },
        },
      }),
    }),
  ],
  providers: [Logger],
  exports: [Logger],
})
export class LoggerModule {}
