import {
  Controller,
  INestApplication,
  Injectable,
  Module,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    it('should use the provided config dictionary', async () => {
      let app!: INestApplication;
      let actualConfigValue: string;
      try {
        app = await createApp(AppModule, {
          appFactory: makeTestAppFactory({ config: { MY_VAR: '🎉' } }),
        });
        const actualController = app.get(TestController);
        actualConfigValue = actualController.configValue;
      } finally {
        await app?.close();
      }

      expect(actualConfigValue).toEqual('🎉');
    });

    it('use the provided config service', async () => {
      let app!: INestApplication;
      let actualConfigValue: string;
      try {
        app = await createApp(AppModule, {
          appFactory: makeTestAppFactory({
            config: createMockConfigService({ MY_VAR: '🍦' }),
          }),
        });
        const actualController = app.get(TestController);
        actualConfigValue = actualController.configValue;
      } finally {
        await app?.close();
      }

      expect(actualConfigValue).toEqual('🍦');
    });

    it('should allow overriding providers', async () => {
      let app!: INestApplication;
      let actualServiceOutput: string;
      try {
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
        actualServiceOutput = actualController.serviceOutput;
      } finally {
        await app?.close();
      }

      expect(actualServiceOutput).toEqual('🤡');
    });

    it('should allow overriding several providers', async () => {
      let app!: INestApplication;
      let actualServiceOutput: string;
      let actualConfigValue: string;
      try {
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
        actualServiceOutput = actualController.serviceOutput;
        actualConfigValue = actualController.configValue;
      } finally {
        await app?.close();
      }

      expect(actualServiceOutput).toEqual('🤡');
      expect(actualConfigValue).toEqual('🐛');
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
