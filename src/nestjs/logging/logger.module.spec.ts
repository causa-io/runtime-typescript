import { jest } from '@jest/globals';
import type * as nestjsCommonType from '@nestjs/common';
import type { INestApplication, Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Test as TestType } from '@nestjs/testing';
import type { PinoLogger as PinoLoggerType } from 'nestjs-pino';
import { pino, type Logger as PinoLogger } from 'pino';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import type * as loggingTestingType from '../../logging/testing.js';
import type { LoggerModule as LoggerModuleType } from './logger.module.js';

describe('LoggerModule', () => {
  let loggingTesting: typeof loggingTestingType;
  // NestJS packages are imported dynamically, such that they are the very same instances as the ones used by the
  // dynamically imported `LoggerModule` and `nestjs-pino`. Otherwise, `jest.resetModules()` leaves two copies of
  // `@nestjs/common` and `@nestjs/core` in play, which breaks dependency injection and `instanceof` checks.
  let Test: typeof TestType;
  let TestController: Type;
  let LoggerModule: typeof LoggerModuleType;
  let PinoNestJsLogger: any;
  let PinoLogger: typeof PinoLoggerType;

  let healthFun: () => string;

  function createTestController(common: typeof nestjsCommonType): Type {
    const { Controller, Get, HttpException, HttpStatus, Inject, Logger } =
      common;

    @Controller()
    class TestController {
      private readonly logger = new Logger(TestController.name);

      constructor(
        // This allows to inject `PinoLogger` without importing the class at the root of this file.
        // This would otherwise interfere with mocking.
        @Inject('PinoLoggerCustomToken')
        private readonly pinoLogger: PinoLoggerType,
      ) {}

      @Get('health')
      health() {
        return healthFun();
      }

      @Get('someRoute')
      route() {
        this.logger.warn({ extraParam: '✨' }, 'some warning');
        this.pinoLogger.assign({ assigned: '🍦' });
        return 'Yo';
      }

      @Get('someError')
      routeError() {
        throw new HttpException({}, HttpStatus.I_AM_A_TEAPOT);
      }
    }

    return TestController;
  }

  let app: INestApplication;
  let request: TestAgent<supertest.Test>;

  beforeEach(async () => {
    healthFun = () => 'OK';

    jest.resetModules();

    ({ Test } = await import('@nestjs/testing'));
    TestController = createTestController(await import('@nestjs/common'));
    loggingTesting = await import('../../logging/testing.js');
    ({ LoggerModule } = await import('./logger.module.js'));
    ({ Logger: PinoNestJsLogger, PinoLogger } = await import('nestjs-pino'));
  });

  async function initApp(options: { logger?: PinoLogger } = {}) {
    const testingModule = await Test.createTestingModule({
      imports: [
        options.logger
          ? LoggerModule.forRoot({ logger: options.logger })
          : LoggerModule.forRoot(),
      ],
      controllers: [TestController],
      providers: [
        { provide: 'PinoLoggerCustomToken', useExisting: PinoLogger },
      ],
    }).compile();
    app = testingModule.createNestApplication<NestExpressApplication>();
    app.useLogger(app.get(PinoNestJsLogger));
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

  it('should assign bindings to responses', async () => {
    await initApp();

    await request.get('/someRoute').expect(200);

    const actualRequestCompletedLogs = loggingTesting.getLoggedInfos({
      predicate: (o) => o.message === 'request completed',
    });
    expect(actualRequestCompletedLogs).toEqual([
      expect.objectContaining({ assigned: '🍦' }),
    ]);
  });

  it('should use the same message for failed requests', async () => {
    await initApp();

    await request.get('/someError').expect(418);

    const actualRequestCompletedLogs = loggingTesting.getLoggedInfos({
      predicate: (o) => o.message === 'request completed',
    });
    expect(actualRequestCompletedLogs[0].req.url).toEqual('/someError');
  });
});
