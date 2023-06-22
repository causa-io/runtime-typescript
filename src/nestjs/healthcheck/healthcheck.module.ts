import { Controller, Get, Module } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../auth/index.js';

/**
 * The name of the endpoint responding to health checks.
 */
export const HEALTH_ENDPOINT = 'health';

/**
 * The controller responding to health checks.
 */
@Controller(HEALTH_ENDPOINT)
export class HealthController {
  @Get()
  @Public()
  @ApiExcludeEndpoint()
  get() {
    return;
  }
}

/**
 * This module can be imported in a REST NestJS application to provide a `/health` endpoint that will return `200 OK`.
 * The endpoint can be used by any kind of orchestrator or load balancer to check the health of the service.
 */
@Module({
  controllers: [HealthController],
})
export class HealthcheckModule {}
