import { Controller, Get, Module, Query } from '@nestjs/common';
import { AppFixture, LoggingFixture } from '../testing.js';
import { Logger } from './index.js';

@Controller('test')
class MyController {
  constructor(readonly logger: Logger) {}

  @Get()
  async testEndpoint(
    @Query('level') level: string | undefined,
    @Query('message') message: string | undefined,
  ): Promise<void> {
    this.logger.assign({ someValue: '💮' });

    switch (level) {
      case 'error':
        this.logger.error(message ?? '💥');
        return;
      case 'warn':
        this.logger.warn(message ?? '⚠️');
        return;
      default:
        this.logger.info('👋');
        return;
    }
  }
}

@Module({ controllers: [MyController] })
class TestModule {}

describe('LoggingFixture', () => {
  let appFixture: AppFixture;
  let loggingFixture: LoggingFixture;

  afterEach(async () => {
    await appFixture.delete();
  });

  async function initFixture(
    options: { prettyLogs?: boolean; expectNoError?: boolean } = {},
  ): Promise<void> {
    loggingFixture = new LoggingFixture({ prettyLogs: false, ...options });
    appFixture = new AppFixture(TestModule, { fixtures: [loggingFixture] });
    await appFixture.init();
  }

  describe('clear', () => {
    it('should expect no error by default', async () => {
      await initFixture();
      await appFixture.request.get('/test?level=error').expect(200);

      const actualPromise = appFixture.clear();

      await expect(actualPromise).rejects.toThrow('deep equality');
    });

    it('should not expect no error if configured', async () => {
      await initFixture({ expectNoError: false });
      await appFixture.request.get('/test?level=error').expect(200);

      await appFixture.clear();
    });

    it('should not expect no error if an error has explicitly been expected', async () => {
      await initFixture();
      await appFixture.request.get('/test?level=error').expect(200);
      appFixture.get(LoggingFixture).expectErrors({ message: '💥' });

      await appFixture.clear();
    });
  });

  describe('expectErrors', () => {
    it('should expect an error', async () => {
      await initFixture();
      await appFixture.request.get('/test?level=error').expect(200);

      loggingFixture.expectErrors({ someValue: '💮', message: '💥' });
    });

    it('should expect multiple errors', async () => {
      await initFixture();
      await appFixture.request.get('/test?level=error').expect(200);
      await appFixture.request.get('/test?level=error&message=🚨').expect(200);

      loggingFixture.expectErrors([{ message: '💥' }, { message: '🚨' }]);
    });

    it('should expect some errors out of many', async () => {
      await initFixture();
      await appFixture.request.get('/test?level=error').expect(200);
      await appFixture.request.get('/test?level=error&message=🚨').expect(200);
      await appFixture.request.get('/test?level=error&message=😱').expect(200);

      loggingFixture.expectErrors(
        [{ message: '😱' }, { message: '💥', someValue: '💮' }],
        { exact: false },
      );
    });
  });

  describe('expectWarnings', () => {
    it('should expect a warning', async () => {
      await initFixture();
      await appFixture.request.get('/test?level=warn').expect(200);

      loggingFixture.expectWarnings({ someValue: '💮', message: '⚠️' });
    });
  });

  describe('expectInfos', () => {
    it('should expect an info log', async () => {
      await initFixture();
      await appFixture.request.get('/test').expect(200);

      loggingFixture.expectInfos(
        { someValue: '💮', message: '👋' },
        { exact: false },
      );
    });
  });
});
