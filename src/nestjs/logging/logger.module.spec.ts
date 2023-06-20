import { Controller, Get, INestApplication, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Logger as PinoLogger } from 'nestjs-pino';
import supertest from 'supertest';
import {
  getLoggedErrors,
  getLoggedInfos,
  getLoggedObjects,
  getLoggedWarnings,
  spyOnLogger,
} from '../../logging/testing.js';
import { LoggerModule } from './logger.module.js';

describe('LoggerModule', () => {
  let healthFun: () => string;

  @Controller()
  class TestController {
    private readonly logger = new Logger(TestController.name);

    @Get('health')
    health() {
      return healthFun();
    }

    @Get('someRoute')
    route() {
      this.logger.warn({ extraParam: '✨' }, 'some warning');
      return 'Yo';
    }
  }

  let app: INestApplication;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    spyOnLogger();
  });

  beforeEach(async () => {
    healthFun = () => 'OK';

    const testingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      controllers: [TestController],
    }).compile();
    app = testingModule.createNestApplication<NestExpressApplication>();
    app.useLogger(app.get(PinoLogger));
    await app.init();

    request = supertest(app.getHttpServer());
  });

  afterEach(async () => {
    await app.close();
  });

  it('should not log successful healthchecks', async () => {
    await request.get('/health').expect(200);

    const actualLoggedObjects = getLoggedObjects();
    const actualLoggedUrls = actualLoggedObjects.map((o) => o.req?.url);
    expect(actualLoggedUrls).not.toContain('/health');
  });

  it('should log failed healthchecks', async () => {
    healthFun = () => {
      throw new Error();
    };

    await request.get('/health').expect(500);

    expect(getLoggedErrors()).toEqual([
      expect.objectContaining({
        req: expect.objectContaining({ url: '/health' }),
      }),
    ]);
  });

  it('should redact the authorization header', async () => {
    await request
      .get('/someRoute')
      .set('Authorization', 'some token')
      .expect(200);

    expect(
      getLoggedInfos({
        predicate: (o) => o.message === 'request completed',
      }),
    ).toEqual([
      expect.objectContaining({
        req: expect.objectContaining({
          url: '/someRoute',
          headers: expect.objectContaining({ authorization: '[Redacted]' }),
        }),
      }),
    ]);
  });

  it('should inherit the logger configuration', async () => {
    await request.get('/someRoute').expect(200);

    expect(
      getLoggedWarnings({
        predicate: (o) => o.message === 'some warning',
      }),
    ).toEqual([
      expect.objectContaining({
        serviceContext: expect.objectContaining({
          service: expect.any(String),
          version: expect.any(String),
        }),
        req: expect.objectContaining({ url: '/someRoute' }),
        extraParam: '✨',
      }),
    ]);
  });
});
