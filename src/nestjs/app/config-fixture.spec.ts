import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigFixture, createMockConfigService } from './config-fixture.js';
import { AppFixture } from './testing.js';

describe('createMockConfigService', () => {
  it('should return the initial configuration', () => {
    const configService = createMockConfigService({
      MY_VAR: '👋',
    });

    expect(configService.get('MY_VAR')).toEqual('👋');
    expect(configService.get('NOPE')).toBeUndefined();
  });

  it('should not read from the environment', () => {
    process.env.CONFIG_FIXTURE_TEST_VAR = '🙈';

    try {
      const configService = createMockConfigService({ MY_VAR: '👋' });

      expect(configService.get('CONFIG_FIXTURE_TEST_VAR')).toBeUndefined();
      expect(configService.get('MY_VAR')).toEqual('👋');
    } finally {
      delete process.env.CONFIG_FIXTURE_TEST_VAR;
    }
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

describe('ConfigFixture', () => {
  let appFixture: AppFixture;

  beforeEach(() => {
    appFixture = new AppFixture(ConfigModule.forRoot());
  });

  afterEach(async () => {
    await appFixture.delete();
  });

  it('should override the ConfigService', async () => {
    const fixture = new ConfigFixture({ MY_VAR: '👋' });
    appFixture.add(fixture);
    await appFixture.init();

    const configService = appFixture.get(ConfigService);
    const actualValue = configService.get('MY_VAR');

    expect(actualValue).toEqual('👋');
  });
});
