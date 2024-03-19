import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

/**
 * A base class that can be used to define a simple health check.
 * This is meant to be used with the `HealthCheckModule`.
 */
export abstract class BaseHealthIndicatorService extends HealthIndicator {
  /**
   * Checks the health of the indicator.
   * This should throw a `HealthCheckError` if the indicator is unhealthy.
   *
   * @returns The health indicator result.
   */
  abstract check(): Promise<HealthIndicatorResult>;
}
