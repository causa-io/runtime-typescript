import { jest } from '@jest/globals';
import { Controller, Get, Module } from '@nestjs/common';
import { AppFixture, LoggingFixture } from '../testing.js';
import { Logger } from './index.js';

// This test is in its own file because the `nestjs-pino` HTTP middleware is created once per process, with the logger
// of the first application. Applications using non-pretty logs in the same file would prevent the pretty logger from
// being used.

@Controller('test')
class MyController {
  constructor(readonly logger: Logger) {}

  @Get()
  async testEndpoint(): Promise<void> {
    this.logger.assign({ someValue: '💮' });
    this.logger.warn('⚠️');
  }
}

@Module({ controllers: [MyController] })
class TestModule {}

describe('LoggingFixture', () => {
  let appFixture: AppFixture;
  let loggingFixture: LoggingFixture;

  beforeEach(async () => {
    loggingFixture = new LoggingFixture({ prettyLogs: true });
    appFixture = new AppFixture(TestModule, { fixtures: [loggingFixture] });
    await appFixture.init();
  });

  afterEach(async () => {
    await appFixture.delete();
  });

  describe('prettyLogs', () => {
    it('should pretty print logs and still match JSON logs', async () => {
      jest.spyOn(process.stdout, 'write');
      await appFixture.request.get('/test').expect(200);

      // This removes the color codes from the logs.
      const actualStrings = (process.stdout.write as jest.Mock).mock.calls.map(
        (args) => (args[0] as string).replaceAll(/\x1B\[[0-9;]*m/g, ''),
      );
      expect(
        actualStrings.filter((log) =>
          log.match(/^WARN \[\d\d:\d\d:\d\d\.\d\d\d\]: ⚠️\n/),
        ),
      ).toHaveLength(1);
      loggingFixture.expectWarnings({ someValue: '💮', message: '⚠️' });
    });
  });
});
