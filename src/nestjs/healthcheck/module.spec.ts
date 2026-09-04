import { Injectable, type INestApplication, Module } from '@nestjs/common';
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import 'jest-extended';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import { getLoggedErrors, spyOnLogger } from '../../testing.js';
import { createApp } from '../app/index.js';
import { AuthModule } from '../auth/index.js';
import { LoggerModule } from '../logging/index.js';
import { generateOpenApiDocument } from '../openapi/utils.test.js';
import type { HealthChecker } from './checker.js';
import { HealthCheckModule } from './module.js';

let isIndicator1Healthy = true;
let indicator1Error: Error | undefined;

@Injectable()
class Indicator1 implements HealthChecker {
  constructor(private readonly healthIndicator: HealthIndicatorService) {}

  async check(): Promise<HealthIndicatorResult> {
    if (indicator1Error) {
      throw indicator1Error;
    }

    const session = this.healthIndicator.check('indicator1');
    return isIndicator1Healthy ? session.up() : session.down();
  }
}

@Injectable()
class Indicator2 implements HealthChecker {
  constructor(private readonly healthIndicator: HealthIndicatorService) {}

  async check(): Promise<HealthIndicatorResult> {
    return this.healthIndicator.check('indicator2').up();
  }
}

@Module({
  imports: [
    AuthModule, // Ensures the health endpoint is marked as public.
    LoggerModule.forRoot(),
    HealthCheckModule.forIndicators([Indicator1, Indicator2]),
  ],
})
class MyModule {}

describe('HealthcheckModule', () => {
  let app: INestApplication;
  let request: TestAgent<supertest.Test>;

  beforeAll(async () => {
    spyOnLogger();

    app = await createApp(MyModule);
    request = supertest(app.getHttpServer());
  });

  beforeEach(() => {
    isIndicator1Healthy = true;
    indicator1Error = undefined;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should expose the health endpoint', async () => {
    await request.get('/health').expect(200);
  });

  it('should fail if one of the provided indicators fails', async () => {
    isIndicator1Healthy = false;

    await request.get('/health').expect(503);

    expect(getLoggedErrors()).toEqual([
      expect.objectContaining({
        message: expect.toSatisfy((message: string) => {
          expect(message).toContain('Health Check has failed!');
          expect(message).toContain('"indicator1":{"status":"down"}');
          expect(message).toContain('"indicator2":{"status":"up"}');
          return true;
        }),
        req: expect.objectContaining({ url: '/health' }),
        serviceContext: expect.objectContaining({
          service: 'runtime',
        }),
      }),
    ]);
  });

  it('should return an internal server error if one of the indicators throws', async () => {
    indicator1Error = new Error('💥');

    await request.get('/health').expect(500);
  });

  it('should exclude the health endpoint from the OpenAPI documentation', async () => {
    const actualDocument = await generateOpenApiDocument(
      HealthCheckModule.forIndicators([]),
    );

    expect(actualDocument.paths).toEqual({});
  });
});
