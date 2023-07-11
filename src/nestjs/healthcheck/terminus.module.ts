import { TerminusModule } from '@nestjs/terminus';
import { Logger } from 'nestjs-pino';

/**
 * The module that exposes the `@nestjs/terminus` `HealthCheckService`, configured with the correct logger.
 */
export const terminusModuleWithLogger = TerminusModule.forRoot({
  logger: Logger,
});
