import { Global, Logger, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { getDefaultLogger } from '../../logging/index.js';
import { HEALTH_ENDPOINT } from '../healthcheck/healthcheck.module.js';

/**
 * This module exposes a ready-to-use logger for NestJS REST services. It can be imported in the application module such
 * that the `Logger` dependency can be injected into any module.
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        // Passing the default logger ensures the default configuration is inherited...
        logger: getDefaultLogger(),
        // ... the following only sets up pino-http specific settings.
        autoLogging: {
          ignore: (req) => (req as any).originalUrl === `/${HEALTH_ENDPOINT}`,
        },
        redact: { paths: ['req.headers.authorization'] },
      },
    }),
  ],
  providers: [Logger],
  exports: [Logger],
})
export class LoggerModule {}
