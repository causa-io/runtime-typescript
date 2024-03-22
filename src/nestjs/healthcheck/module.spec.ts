import { INestApplication, Module } from '@nestjs/common';
import { HealthCheckError, HealthIndicatorResult } from '@nestjs/terminus';
import 'jest-extended';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import { getLoggedErrors, spyOnLogger } from '../../testing.js';
import { AuthModule } from '../auth/index.js';
import { createApp } from '../factory/index.js';
import { LoggerModule } from '../logging/index.js';
import { generateOpenApiDocument } from '../openapi/utils.test.js';
import { BaseHealthIndicatorService } from './base-health-indicator.service.js';
import { HealthCheckModule } from './module.js';

let isIndicator1Healthy = true;

class Indicator1 extends BaseHealthIndicatorService {
  async check(): Promise<HealthIndicatorResult> {
    if (!isIndicator1Healthy) {
      throw new HealthCheckError('Oopsie', this.getStatus('indicator1', false));
    }

    return this.getStatus('indicator1', true);
  }
}

class Indicator2 extends BaseHealthIndicatorService {
  async check(): Promise<HealthIndicatorResult> {
    return this.getStatus('indicator2', true);
  }
}

@Module({
  imports: [
    AuthModule, // Ensures the health endpoint is marked as public.
    LoggerModule,
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

  it('should exclude the health endpoint from the OpenAPI documentation', async () => {
    const actualDocument = await generateOpenApiDocument(
      HealthCheckModule.forIndicators([]),
    );

    expect(actualDocument.paths).toEqual({});
  });
});
