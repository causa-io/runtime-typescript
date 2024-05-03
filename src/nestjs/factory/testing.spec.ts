import {
  Controller,
  INestApplication,
  Injectable,
  Module,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import supertest from 'supertest';
import { createApp } from './app-factory.js';
import { createMockConfigService, makeTestAppFactory } from './testing.js';

@Injectable()
class MyService {
  computeStuff() {
    return '➗';
  }
}

@Controller('test')
class TestController {
  readonly configValue: string;
  readonly serviceOutput: string;

  constructor(configService: ConfigService, myService: MyService) {
    this.configValue = configService.getOrThrow('MY_VAR');
    this.serviceOutput = myService.computeStuff();
  }
}

@Module({ controllers: [TestController], providers: [MyService] })
class TestModule {}

@Module({
  imports: [TestModule],
})
class AppModule {}

describe('testing', () => {
  describe('makeTestAppFactory', () => {
    let app!: INestApplication;

    afterEach(async () => {
      await app?.close();
    });

    it('should use the provided config dictionary', async () => {
      app = await createApp(AppModule, {
        appFactory: makeTestAppFactory({ config: { MY_VAR: '🎉' } }),
      });

      const actualController = app.get(TestController);
      expect(actualController.configValue).toEqual('🎉');
    });

    it('use the provided config service', async () => {
      app = await createApp(AppModule, {
        appFactory: makeTestAppFactory({
          config: createMockConfigService({ MY_VAR: '🍦' }),
        }),
      });

      const actualController = app.get(TestController);
      expect(actualController.configValue).toEqual('🍦');
    });

    it('should allow overriding providers', async () => {
      app = await createApp(AppModule, {
        appFactory: makeTestAppFactory({
          config: { MY_VAR: '🍦' },
          overrides: (builder) =>
            builder
              .overrideProvider(MyService)
              .useValue({ computeStuff: () => '🤡' }),
        }),
      });

      const actualController = app.get(TestController);
      expect(actualController.serviceOutput).toEqual('🤡');
    });

    it('should allow overriding several providers', async () => {
      app = await createApp(AppModule, {
        appFactory: makeTestAppFactory({
          config: { MY_VAR: '🍦' },
          overrides: [
            (builder) =>
              builder
                .overrideProvider(MyService)
                .useValue({ computeStuff: () => '🤡' }),
            (builder) =>
              builder
                .overrideProvider(ConfigService)
                .useValue({ getOrThrow: () => '🐛' }),
          ],
        }),
      });

      const actualController = app.get(TestController);
      expect(actualController.serviceOutput).toEqual('🤡');
      expect(actualController.configValue).toEqual('🐛');
    });

    it('should pass the provided nest application options', async () => {
      app = await createApp(AppModule, {
        appFactory: makeTestAppFactory({ config: { MY_VAR: '🍦' } }),
        nestApplicationOptions: { cors: true },
      });
      const request = supertest(app.getHttpServer());

      await request.options('/test').expect(204);
    });
  });

  describe('createMockConfigService', () => {
    it('should return the initial configuration', () => {
      const configService = createMockConfigService({
        MY_VAR: '👋',
      });

      expect(configService.get('MY_VAR')).toEqual('👋');
      expect(configService.get('NOPE')).toBeUndefined();
    });

    it('should allow further override of the configuration', () => {
      const configService = createMockConfigService({
        MY_VAR: '👋',
      });
      configService.internalConfig = {
        MY_OTHER_VAR: '✨',
      };

      expect(configService.get('MY_OTHER_VAR')).toEqual('✨');
      expect(configService.get('MY_VAR')).toBeUndefined();
    });
  });
});
