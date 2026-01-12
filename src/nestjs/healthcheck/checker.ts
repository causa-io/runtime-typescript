import type { HealthIndicatorResult } from '@nestjs/terminus';

/**
 * An interface that defines a health checker.
 * This should be implemented by services passed to the `HealthCheckModule`.
 */
export interface HealthChecker {
  /**
   * Checks the health of the system.
   *
   * @returns The health indicator result.
   */
  check(): Promise<HealthIndicatorResult>;
}
