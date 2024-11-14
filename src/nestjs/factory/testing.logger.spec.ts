import { jest } from '@jest/globals';
import {
  Controller,
  type INestApplication,
  Injectable,
  Module,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '../logging/index.js';
import { createApp } from './app-factory.js';
import { makeTestAppFactory } from './testing.js';

@Injectable()
class MyService {
  constructor(private readonly logger: Logger) {}

  computeStuff() {
    this.logger.debug('👋');
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

@Module({ imports: [TestModule] })
class AppModule {}

describe('testing', () => {
  describe('makeTestAppFactory', () => {
    // This test is in a separate file to ensure it runs independently of the other `createApp` calls.
    // `PinoLogger` holds a singleton logger, which makes it hard to reset the logger configuration between test.
    // The other solution would be to dynamically load the modules.
    it('should pretty print logs', async () => {
      jest.spyOn(process.stdout, 'write');

      let app!: INestApplication;
      try {
        app = await createApp(AppModule, {
          appFactory: makeTestAppFactory({
            config: { MY_VAR: '🎉' },
            prettyLogs: true,
          }),
        });
      } finally {
        await app?.close();
      }

      // This removes the color codes from the logs.
      const actualStrings = (process.stdout.write as jest.Mock).mock.calls.map(
        (args) => (args[0] as string).replaceAll(/\x1B\[[0-9;]*m/g, ''),
      );
      expect(
        actualStrings.filter((log) =>
          log.match(/^DEBUG \[\d\d:\d\d:\d\d\.\d\d\d\]: 👋\n$/),
        ),
      ).toHaveLength(1);
    });
  });
});
