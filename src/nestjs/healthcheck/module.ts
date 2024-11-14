import {
  Controller,
  type DynamicModule,
  Get,
  Module,
  type Type,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  type HealthCheckResult,
  HealthCheckService,
  type HealthIndicatorFunction,
} from '@nestjs/terminus';
import { Public } from '../auth/index.js';
import { BaseHealthIndicatorService } from './base-health-indicator.service.js';
import { HEALTHCHECK_ENDPOINT } from './index.js';
import { terminusModuleWithLogger } from './terminus.module.js';

/**
 * A module that provides a controller handling requests to the {@link HEALTHCHECK_ENDPOINT}.
 */
@Module({})
export class HealthCheckModule {
  /**
   * Creates the health check module for the given indicator types.
   * Indicators should extend the {@link BaseHealthIndicatorService}. They will be used as providers for this module,
   * there is no need to export them from another module. However, their dependencies should be available in the rest of
   * the application's modules.
   *
   * @param indicatorTypes The types of the health indicators to be used.
   * @returns The module.
   */
  static forIndicators(
    indicatorTypes: Type<BaseHealthIndicatorService>[],
  ): DynamicModule {
    @ApiExcludeController()
    @Controller(HEALTHCHECK_ENDPOINT)
    class HealthcheckController {
      private readonly indicatorFunctions: HealthIndicatorFunction[];

      constructor(
        private readonly health: HealthCheckService,
        moduleRef: ModuleRef,
      ) {
        this.indicatorFunctions = indicatorTypes.map((indicatorType) => {
          const indicator = moduleRef.get(indicatorType);
          return () => indicator.check();
        });
      }

      @Get()
      @Public()
      async healthCheck(): Promise<HealthCheckResult> {
        return await this.health.check(this.indicatorFunctions);
      }
    }

    return {
      module: HealthCheckModule,
      imports: [terminusModuleWithLogger],
      controllers: [HealthcheckController],
      providers: indicatorTypes,
    };
  }
}
