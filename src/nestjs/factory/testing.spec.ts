import { createMockConfigService } from './testing.js';

describe('test-utils', () => {
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
