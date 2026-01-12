import { HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';
import type { HealthChecker } from './checker.js';

/**
 * A base class that can be used to define a simple health check.
 * This is meant to be used with the `HealthCheckModule`.
 *
 * @deprecated Implement the {@link HealthChecker} interface directly instead.
 */
export abstract class BaseHealthIndicatorService
  extends HealthIndicator
  implements HealthChecker
{
  abstract check(): Promise<HealthIndicatorResult>;
}
