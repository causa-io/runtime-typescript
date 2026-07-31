import { jest } from '@jest/globals';
import {
  Controller,
  Injectable,
  Module,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingFixture } from '../testing.js';
import { ConfigFixture } from './config-fixture.js';
import {
  AppFixture,
  type Fixture,
  type NestJsModuleOverrider,
} from './testing.js';

@Injectable()
class MyService {
  computeStuff() {
    return '➗';
  }
}

@Controller('test')
class TestController {
  readonly serviceOutput: string;

  constructor(myService: MyService) {
    this.serviceOutput = myService.computeStuff();
  }
}

@Module({ controllers: [TestController], providers: [MyService] })
class TestModule {}

@Module({
  imports: [TestModule],
})
class AppModule {}

@Module({ controllers: [TestController] })
class UnresolvableModule {}

@Injectable()
class FailingOnInitService implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    throw new Error('🔥');
  }
}

@Module({ providers: [FailingOnInitService] })
class FailingOnInitModule {}

class Fixture1 implements Fixture {
  async init(): Promise<NestJsModuleOverrider> {
    return (builder) =>
      builder.overrideProvider(MyService).useValue({
        computeStuff: () => '➕',
      });
  }
  async clear() {}
  async delete() {}
}

class Fixture2 implements Fixture {
  async init(): Promise<undefined> {}
  async clear() {}
  async delete() {}
}

class FailingFixture implements Fixture {
  async init(): Promise<undefined> {
    throw new Error('💥');
  }
  async clear() {}
  async delete() {}
}

describe('AppFixture', () => {
  let appFixture!: AppFixture;

  afterEach(async () => {
    // Some tests do not initialize the fixture, or already delete it. In those cases, `delete` throws and there is
    // nothing to clean up.
    await appFixture?.delete().catch(() => {});
  });

  describe('constructor', () => {
    it('should store the passed fixtures', () => {
      const fixture1 = new Fixture1();
      const fixture2 = new Fixture2();

      appFixture = new AppFixture(AppModule, {
        fixtures: [fixture1, fixture2],
      });

      expect(appFixture.get(Fixture1)).toEqual(fixture1);
      expect(appFixture.get(Fixture2)).toEqual(fixture2);
    });

    it('should use the provided config dictionary', async () => {
      appFixture = new AppFixture(AppModule, { config: { MY_VAR: '🎉' } });

      const actualConfigFixture = appFixture.get(ConfigFixture);

      expect(actualConfigFixture?.config).toEqual({ MY_VAR: '🎉' });
    });

    it('should throw when passing both a config and a config fixture', () => {
      expect(() => {
        new AppFixture(AppModule, {
          fixtures: [new ConfigFixture({ MY_VAR: '🎉' })],
          config: { MY_VAR: '🎉' },
        });
      }).toThrow(
        'Configuration was passed both as a fixture and as an object.',
      );
    });

    it('should add the logging fixture if not provided', () => {
      appFixture = new AppFixture(AppModule, {});

      const loggingFixture = appFixture.get(LoggingFixture);

      expect(loggingFixture).toBeInstanceOf(LoggingFixture);
      expect(loggingFixture.prettyLogs).toBe(true);
      expect(loggingFixture.expectNoError).toBe(true);
    });

    it('should not add the logging fixture if already provided', () => {
      const loggingFixture = new LoggingFixture({
        prettyLogs: false,
        expectNoError: false,
      });

      appFixture = new AppFixture(AppModule, { fixtures: [loggingFixture] });

      const actualLoggingFixture = appFixture.get(LoggingFixture);
      expect(actualLoggingFixture).toBe(loggingFixture);
    });

    it('should pass the provided nest application options', async () => {
      appFixture = new AppFixture(AppModule, {
        config: { MY_VAR: '🍦' },
        nestApplicationOptions: { cors: true },
      });

      expect(appFixture.nestApplicationOptions).toEqual({ cors: true });
    });

    it('should store the passed override', () => {
      const override: NestJsModuleOverrider = (builder) =>
        builder
          .overrideProvider(MyService)
          .useValue({ computeStuff: () => '✖️' });

      appFixture = new AppFixture(AppModule, { override });

      expect(appFixture.override).toBe(override);
    });
  });

  describe('add', () => {
    it('should add a fixture to the list', () => {
      const fixture = new Fixture1();
      appFixture = new AppFixture(AppModule, {});

      appFixture.add(fixture);

      expect(appFixture.get(Fixture1)).toEqual(fixture);
    });

    it('should throw after initialization', async () => {
      appFixture = new AppFixture(AppModule, {});
      await appFixture.init();
      const fixture = new Fixture1();

      expect(() => appFixture.add(fixture)).toThrow(
        'Cannot add fixture after initialization.',
      );
    });
  });

  describe('get', () => {
    it('should throw when getting a service before initialization', () => {
      appFixture = new AppFixture(AppModule, {});

      expect(() => appFixture.get(TestController)).toThrow(
        'Cannot get instance when fixture is not active.',
      );
    });

    it('should return the instance of a service after initialization', async () => {
      appFixture = new AppFixture(AppModule, {});
      await appFixture.init();

      const controller = appFixture.get(TestController);

      expect(controller).toBeInstanceOf(TestController);
    });
  });

  describe('init', () => {
    it('should create the app module with default imports', async () => {
      appFixture = new AppFixture(AppModule, {});

      await appFixture.init();

      const actualConfigService = appFixture.get(ConfigService);
      expect(actualConfigService).toBeInstanceOf(ConfigService);
    });

    it('should run overrides from fixtures', async () => {
      const fixture1 = new Fixture1();
      appFixture = new AppFixture(AppModule, { fixtures: [fixture1] });
      jest.spyOn(fixture1, 'init');

      await appFixture.init();

      const controller = appFixture.get(TestController);
      expect(controller.serviceOutput).toEqual('➕');
      expect(fixture1.init).toHaveBeenCalledExactlyOnceWith(appFixture);
    });

    it('should run the override if provided', async () => {
      const override: NestJsModuleOverrider = (builder) =>
        builder
          .overrideProvider(MyService)
          .useValue({ computeStuff: () => '✖️' });
      appFixture = new AppFixture(AppModule, { override });

      await appFixture.init();

      const controller = appFixture.get(TestController);
      expect(controller.serviceOutput).toEqual('✖️');
    });

    it('should pass the provided nest application options and initialize request', async () => {
      appFixture = new AppFixture(AppModule, {
        config: { MY_VAR: '🍦' },
        nestApplicationOptions: { cors: true },
      });

      await appFixture.init();

      await appFixture.request.options('/test').expect(204);
    });

    it('should make the server listen on the loopback address before supertest binds it', async () => {
      appFixture = new AppFixture(AppModule, {});

      await appFixture.init();

      const server = appFixture.app.getHttpServer();
      expect(server.listening).toBeTrue();
      expect(server.address()).toMatchObject({ address: '127.0.0.1' });
    });

    it('should throw if init is called twice', async () => {
      appFixture = new AppFixture(AppModule, {});
      await appFixture.init();

      const actualPromise = appFixture.init();

      await expect(actualPromise).rejects.toThrow(
        'Cannot initialize the application more than once.',
      );
    });

    it('should delete the initialized fixtures and rethrow when a fixture fails to initialize', async () => {
      const fixture1 = new Fixture1();
      const failingFixture = new FailingFixture();
      jest.spyOn(fixture1, 'delete');
      jest.spyOn(failingFixture, 'delete');
      appFixture = new AppFixture(AppModule, {
        fixtures: [fixture1, failingFixture],
      });

      const actualPromise = appFixture.init();

      await expect(actualPromise).rejects.toThrow('💥');
      expect(fixture1.delete).toHaveBeenCalledOnce();
      expect(failingFixture.delete).not.toHaveBeenCalled();
    });

    it('should delete the fixtures and rethrow when the module fails to compile', async () => {
      const fixture2 = new Fixture2();
      jest.spyOn(fixture2, 'delete');
      appFixture = new AppFixture(UnresolvableModule, { fixtures: [fixture2] });

      const actualPromise = appFixture.init();

      await expect(actualPromise).rejects.toThrow(/Nest can't resolve/);
      expect(fixture2.delete).toHaveBeenCalledOnce();
    });

    it('should close the application and delete the fixtures when the application fails to initialize', async () => {
      const fixture2 = new Fixture2();
      jest.spyOn(fixture2, 'delete');
      appFixture = new AppFixture(FailingOnInitModule, {
        fixtures: [fixture2],
      });

      const actualPromise = appFixture.init();

      await expect(actualPromise).rejects.toThrow('🔥');
      expect(fixture2.delete).toHaveBeenCalledOnce();
      expect(appFixture.app).toBeUndefined();
      expect(appFixture.request).toBeUndefined();
    });

    it('should make clear and delete no-ops after a failed initialization', async () => {
      const fixture1 = new Fixture1();
      jest.spyOn(fixture1, 'clear');
      jest.spyOn(fixture1, 'delete');
      appFixture = new AppFixture(AppModule, {
        fixtures: [fixture1, new FailingFixture()],
      });
      await expect(appFixture.init()).rejects.toThrow('💥');
      (fixture1.delete as jest.Mock).mockClear();

      await appFixture.clear();
      await appFixture.delete();

      expect(fixture1.clear).not.toHaveBeenCalled();
      expect(fixture1.delete).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    let fixture1: Fixture1;
    let fixture2: Fixture2;

    beforeEach(() => {
      fixture1 = new Fixture1();
      fixture2 = new Fixture2();
      appFixture = new AppFixture(AppModule, {
        fixtures: [fixture1, fixture2],
      });
      jest.spyOn(fixture1, 'clear');
      jest.spyOn(fixture2, 'clear');
    });

    it('should clear all fixtures', async () => {
      await appFixture.init();

      await appFixture.clear();

      expect(fixture1.clear).toHaveBeenCalled();
      expect(fixture2.clear).toHaveBeenCalled();
    });

    it('should throw if a fixture fails to clear', async () => {
      jest.spyOn(fixture2, 'clear').mockRejectedValue(new Error('💥'));
      await appFixture.init();

      const actualPromise = appFixture.clear();

      await expect(actualPromise).rejects.toThrow('💥');
      expect(fixture1.clear).toHaveBeenCalled();
      expect(fixture2.clear).toHaveBeenCalled();
    });

    it('should throw if called before initialization', async () => {
      const actualPromise = appFixture.clear();

      await expect(actualPromise).rejects.toThrow(
        'Cannot clear fixtures that are not active.',
      );
    });
  });

  describe('delete', () => {
    let fixture1: Fixture1;
    let fixture2: Fixture2;

    beforeEach(async () => {
      fixture1 = new Fixture1();
      fixture2 = new Fixture2();
      appFixture = new AppFixture(AppModule, {
        fixtures: [fixture1, fixture2],
      });
      jest.spyOn(fixture1, 'delete');
      jest.spyOn(fixture2, 'delete');
      await appFixture.init();
      jest.spyOn(appFixture.app, 'close');
    });

    it('should close the app and all fixtures', async () => {
      await appFixture.delete();

      expect(appFixture.app.close).toHaveBeenCalled();
      expect(fixture1.delete).toHaveBeenCalled();
      expect(fixture2.delete).toHaveBeenCalled();
    });

    it('should throw if a fixture fails to delete', async () => {
      jest.spyOn(fixture2, 'delete').mockRejectedValueOnce(new Error('💥'));

      const actualPromise = appFixture.delete();

      await expect(actualPromise).rejects.toThrow('💥');
      expect(appFixture.app.close).toHaveBeenCalled();
      expect(fixture1.delete).toHaveBeenCalled();
      expect(fixture2.delete).toHaveBeenCalled();
    });

    it('should throw if called before initialization', async () => {
      const appFixture = new AppFixture(AppModule, {
        fixtures: [fixture1, fixture2],
      });

      const actualPromise = appFixture.delete();

      await expect(actualPromise).rejects.toThrow(
        'Cannot delete fixtures that are not active.',
      );
    });
  });
});
