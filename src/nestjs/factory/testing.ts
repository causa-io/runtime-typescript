import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppFactory } from './app-factory.js';

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
 * The options for the {@link makeTestAppFactory} function.
 */
export type MakeTestAppFactoryOptions = {
  /**
   * A dictionary of configuration values (e.g. environment variables), or a (mocked) config service that will be
   * injected as a replacement to the original {@link ConfigService}.
   */
  config?: Record<string, any> | ConfigService | MockedConfigService;

  /**
   * A function that overrides providers in the passed module builder.
   *
   * @param builder The module builder.
   * @returns The module builder returned by calls to builder methods.
   */
  overrides?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
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

  return async (appModule) => {
    let builder = Test.createTestingModule({ imports: [appModule] })
      .overrideProvider(ConfigService)
      .useValue(configService);

    if (options.overrides) {
      builder = options.overrides(builder);
    }

    const moduleRef = await builder.compile();

    return moduleRef.createNestApplication<NestExpressApplication>();
  };
}
