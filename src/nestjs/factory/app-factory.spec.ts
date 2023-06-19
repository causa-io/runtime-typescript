import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { createApp } from './app-factory.js';

@Controller('test')
class TestController {
  readonly someConfValue: string;

  constructor(configService: ConfigService) {
    this.someConfValue = configService.getOrThrow('SOME_CONF_VALUE');
  }

  @Get('/')
  async get() {
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

  beforeEach(async () => {
    previousEnv = { ...process.env };
    process.env.SOME_CONF_VALUE = '🔧';
    app = await createApp(AppModule);
  });

  afterEach(async () => {
    await app.close();
    process.env = previousEnv;
  });

  it('should not return the x-powered-by header', async () => {
    const actualResponse = await request(app.getHttpServer())
      .get('/test')
      .expect(200);
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
});
