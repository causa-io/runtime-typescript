import { Controller, Get, INestApplication, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Logger as PinoLogger } from 'nestjs-pino';
import supertest from 'supertest';
import {
  getLoggedInfos,
  getLoggedWarnings,
  spyOnLogger,
} from '../../logging/testing.js';
import { LoggerModule } from './logger.module.js';

describe('LoggerModule', () => {
  @Controller()
  class TestController {
    private readonly logger = new Logger(TestController.name);

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
