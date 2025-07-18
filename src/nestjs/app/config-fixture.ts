import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import type { Fixture, NestJsModuleOverrider } from './testing.js';

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
 * A fixture that provides a mocked {@link ConfigService} with an initial configuration.
 */
export class ConfigFixture implements Fixture {
  constructor(
    /**
     * The initial configuration that will be used by the mocked {@link ConfigService}.
     * This can be modified during tests by updating the `internalConfig` property of the service.
     */
    readonly config: Record<string, any>,
  ) {}

  async init(): Promise<NestJsModuleOverrider> {
    const configService = createMockConfigService(this.config);

    return (builder) =>
      builder.overrideProvider(ConfigService).useValue(configService);
  }

  async clear(): Promise<void> {}

  async delete(): Promise<void> {}
}
