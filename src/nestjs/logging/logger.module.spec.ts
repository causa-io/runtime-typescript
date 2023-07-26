import { jest } from '@jest/globals';
import { Controller, Get, INestApplication, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { pino } from 'pino';
import supertest from 'supertest';
import type * as loggingTestingType from '../../logging/testing.js';
import type { LoggerModule as LoggerModuleType } from './logger.module.js';

describe('LoggerModule', () => {
  let loggingTesting: typeof loggingTestingType;
  let LoggerModule: typeof LoggerModuleType;
  let PinoLogger: any;

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

  beforeEach(async () => {
    healthFun = () => 'OK';

    jest.resetModules();

    loggingTesting = await import('../../logging/testing.js');
    ({ LoggerModule } = await import('./logger.module.js'));
    ({ Logger: PinoLogger } = await import('nestjs-pino'));
  });

  async function initApp(options: { logger?: pino.Logger } = {}) {
    const testingModule = await Test.createTestingModule({
      imports: [
        options.logger
          ? LoggerModule.forRoot({ logger: options.logger })
          : LoggerModule,
      ],
      controllers: [TestController],
    }).compile();
    app = testingModule.createNestApplication<NestExpressApplication>();
    app.useLogger(app.get(PinoLogger));
    await app.init();

    request = supertest(app.getHttpServer());

    loggingTesting.spyOnLogger();
  }

  afterEach(async () => {
    await app.close();
  });

  it('should not log successful healthchecks', async () => {
    await initApp();

    await request.get('/health').expect(200);

    const actualLoggedObjects = loggingTesting.getLoggedObjects();
    const actualLoggedUrls = actualLoggedObjects.map((o) => o.req?.url);
    expect(actualLoggedUrls).not.toContain('/health');
  });

  it('should log failed healthchecks', async () => {
    healthFun = () => {
      throw new Error();
    };
    await initApp();

    await request.get('/health').expect(500);

    expect(loggingTesting.getLoggedErrors()).toEqual([
      expect.objectContaining({
        req: expect.objectContaining({ url: '/health' }),
      }),
    ]);
  });

  it('should redact the authorization header', async () => {
    await initApp();

    await request
      .get('/someRoute')
      .set('Authorization', 'some token')
      .expect(200);

    expect(
      loggingTesting.getLoggedInfos({
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
    await initApp();

    await request.get('/someRoute').expect(200);

    expect(
      loggingTesting.getLoggedWarnings({
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

  it('should apply an updated configuration', async () => {
    // This tests ensures that a call to `updatePinoConfiguration` prior to initializing the app does indeed configures
    // the logger. This is only true if the `LoggerModule` fetches the default logger asynchronously.
    const { updatePinoConfiguration } = await import('../../logging/index.js');
    updatePinoConfiguration({ base: { alwaysHere: '👋' } });
    await initApp();

    await request.get('/someRoute').expect(200);

    expect(
      loggingTesting.getLoggedWarnings({
        predicate: (o) => o.message === 'some warning',
      }),
    ).toEqual([
      expect.objectContaining({
        extraParam: '✨',
        alwaysHere: '👋',
      }),
    ]);
  });

  it('should accept a different logger', async () => {
    const logger = pino({ base: { different: '❄️' } });
    await initApp({ logger });
    loggingTesting.spyOnLogger(logger);

    await request.get('/someRoute').expect(200);

    expect(
      loggingTesting.getLoggedWarnings({
        logger,
        predicate: (o) => o.msg === 'some warning',
      }),
    ).toEqual([
      expect.objectContaining({
        extraParam: '✨',
        different: '❄️',
      }),
    ]);
  });
});
