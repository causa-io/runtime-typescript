import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import {
  HealthCheckError,
  type HealthCheckResult,
  HealthCheckService,
} from '@nestjs/terminus';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import { getLoggedErrors, spyOnLogger } from '../../testing.js';
import { createApp } from '../index.js';
import { LoggerModule } from '../logging/index.js';
import { terminusModuleWithLogger } from './terminus.module.js';

@Controller('health')
class MyController {
  constructor(private health: HealthCheckService) {}

  @Get()
  async healthCheck(): Promise<HealthCheckResult> {
    return await this.health.check([
      () => Promise.reject(new HealthCheckError('💥', { oops: '🙅' })),
    ]);
  }
}

@Module({
  controllers: [MyController],
  imports: [terminusModuleWithLogger, LoggerModule.forRoot()],
})
class MyModule {}

describe('terminusModuleWithLogger', () => {
  let app: INestApplication;
  let request: TestAgent<supertest.Test>;

  beforeEach(async () => {
    spyOnLogger();

    app = await createApp(MyModule);
    request = supertest(app.getHttpServer());
  });

  afterEach(async () => {
    await app.close();
  });

  it('should log a failing healthcheck with the correct logger', async () => {
    await request.get('/health').expect(503);

    expect(getLoggedErrors()).toEqual([
      expect.objectContaining({
        message: 'Health Check has failed! {"oops":"🙅"}',
        req: expect.objectContaining({ url: '/health' }),
        serviceContext: expect.objectContaining({
          service: 'runtime',
        }),
      }),
    ]);
  });
});
