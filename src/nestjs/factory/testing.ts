import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { type Logger, pino } from 'pino';
import { LoggerModule } from '../logging/index.js';
import type { AppFactory } from './app-factory.js';

/**
 * A mocked {@link ConfigService}.
 * Its `internalConfig` is exposed such that the configuration can be updated after creation.
 */
export type MockedConfigService = Omit<ConfigService, 'internalConfig'> & {
  /**
   * The dictionary containing the configuration, which can be modified during tests.
   */
  internalConfig: Record<string, any>;
};

/**
 * Returns a mock that can be used in place of a {@link ConfigService}.
 * In addition to the original dictionary of variables, the configuration can be modified "on the fly" by updating the
 * value of the service's `internalConfig`.
 *
 * @param config The initial configuration returned by the {@link ConfigService}.
 * @returns The mocked config service.
 */
export function createMockConfigService(
  config: Record<string, any>,
): MockedConfigService {
  const configService = new ConfigService(config);

  // This disables the default behavior that prioritizes configuration from the environment, such that only the
  // configuration explicitly defined in tests is passed.
  jest
    .spyOn(configService as any, 'getFromValidatedEnv')
    .mockReturnValue(undefined);
  jest
    .spyOn(configService as any, 'getFromProcessEnv')
    .mockReturnValue(undefined);

  return configService as any;
}

/**
 * A promise that resolves to a {@link Logger} using the `pino-pretty` formatter.
 * If `pino-pretty` is not installed, the promise resolves to `undefined`.
 */
const prettyLoggerPromise: Promise<Logger | undefined> = (async () => {
  try {
    const { default: pinoPretty } = await import('pino-pretty');
    return pino(
      { level: 'debug' },
      (pinoPretty as any)({
        ignore: 'pid,hostname',
        colorize: true,
        levelFirst: true,
        translateTime: 'SYS:HH:MM:ss.l',
        destination: process.stdout,
      }),
    );
  } catch {
    return;
  }
})();

/**
 * A function that overrides providers in a {@link TestingModuleBuilder}.
 */
export type NestJsModuleOverrider = (
  builder: TestingModuleBuilder,
) => TestingModuleBuilder;

/**
 * The options for the {@link makeTestAppFactory} function.
 */
export type MakeTestAppFactoryOptions = {
  /**
   * A dictionary of configuration values (e.g. environment variables), or a (mocked) config service that will be
   * injected as a replacement to the original {@link ConfigService}.
   */
  config?: Record<string, any> | ConfigService | MockedConfigService;

  /**
   * Whether to format logs as text rather than JSON.
   * This will replace the default logger with a debug-level logger that uses the `pino-pretty` formatter.
   * This requires `pino-pretty` to be installed.
   */
  prettyLogs?: boolean;

  /**
   * A function that overrides providers in the passed module builder.
   *
   * @param builder The module builder.
   * @returns The module builder returned by calls to builder methods.
   */
  overrides?: NestJsModuleOverrider | NestJsModuleOverrider[];
};

/**
 * Makes a new {@link AppFactory} which is based on a testing module.
 * By default, at least the {@link ConfigService} is mocked, but other providers can be replaced as well.
 *
 * @param options Options when making the factory.
 * @returns The factory that can be passed to `createApp`.
 */
export function makeTestAppFactory(
  options: MakeTestAppFactoryOptions = {},
): AppFactory {
  let configService: ConfigService | MockedConfigService;
  if (options.config instanceof ConfigService) {
    configService = options.config;
  } else {
    configService = createMockConfigService(options.config ?? process.env);
  }

  const overrides = options.overrides
    ? Array.isArray(options.overrides)
      ? options.overrides
      : [options.overrides]
    : [];

  return async (appModule, nestApplicationOptions) => {
    let builder = Test.createTestingModule({ imports: [appModule] })
      .overrideProvider(ConfigService)
      .useValue(configService);

    if (options.prettyLogs) {
      builder = builder
        .overrideModule(LoggerModule)
        .useModule(LoggerModule.forRoot({ logger: await prettyLoggerPromise }));
    }

    overrides.forEach((override) => {
      builder = override(builder);
    });

    const moduleRef = await builder.compile();

    return moduleRef.createNestApplication<NestExpressApplication>(
      nestApplicationOptions,
    );
  };
}
