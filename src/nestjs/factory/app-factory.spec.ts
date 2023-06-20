import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import supertest from 'supertest';
import { getLoggedObjects, spyOnLogger } from '../../logging/testing.js';
import { createApp } from './app-factory.js';

@Controller('test')
class TestController {
  readonly someConfValue: string;

  constructor(readonly logger: PinoLogger, configService: ConfigService) {
    this.someConfValue = configService.getOrThrow('SOME_CONF_VALUE');
  }

  @Get('/')
  async get() {
    this.logger.info('💮');
    return;
  }
}

@Module({ controllers: [TestController] })
class TestModule {}

@Module({
  imports: [TestModule],
})
class AppModule {}

describe('app-factory', () => {
  let app: INestApplication;
  let previousEnv: NodeJS.ProcessEnv;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(async () => {
    spyOnLogger();
    previousEnv = { ...process.env };
    process.env.SOME_CONF_VALUE = '🔧';
    app = await createApp(AppModule);
    request = supertest(app.getHttpServer());
  });

  afterEach(async () => {
    await app.close();
    process.env = previousEnv;
  });

  it('should not return the x-powered-by header', async () => {
    const actualResponse = await request.get('/test').expect(200);
    expect(actualResponse.headers).not.toHaveProperty('x-powered-by');
  });

  it('should import the business module', async () => {
    const actualController = app.get(TestController);

    expect(actualController).toBeInstanceOf(TestController);
  });

  it('should import the configuration module', async () => {
    const controller = app.get(TestController);

    const actualConfValue = controller.someConfValue;

    expect(actualConfValue).toEqual('🔧');
  });

  it('should expose the logger module', async () => {
    const controller = app.get(TestController);

    const actualLogger = controller.logger;
    await request.get('/test').expect(200);

    expect(actualLogger).toBeInstanceOf(PinoLogger);
    expect(getLoggedObjects({ predicate: (o) => o.message === '💮' })).toEqual([
      expect.objectContaining({
        req: expect.objectContaining({ url: '/test' }),
      }),
    ]);
  });

  it('should import the healthcheck module', async () => {
    await request.get('/health').expect(200);
  });
});
