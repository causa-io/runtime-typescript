/**
 * The name of the endpoint responding to health checks.
 * The service should respond to this endpoint with a 200 status code if it is healthy.
 */
export const HEALTHCHECK_ENDPOINT = 'health';

export { BaseHealthIndicatorService } from './base-health-indicator.service.js';
export type { HealthChecker } from './checker.js';
export { HealthCheckModule } from './module.js';
export * from './terminus.module.js';
