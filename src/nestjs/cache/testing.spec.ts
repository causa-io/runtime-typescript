import { Cache, CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { AppFixture } from '../app/testing.js';
import { CacheFixture } from './testing.js';

@Module({
  imports: [CacheModule.register()],
})
class MyModule {}

describe('CacheFixture', () => {
  let appFixture: AppFixture;
  let cacheFixture: CacheFixture;

  beforeEach(async () => {
    cacheFixture = new CacheFixture();
    appFixture = new AppFixture(MyModule, { fixtures: [cacheFixture] });
    await appFixture.init();
  });

  afterEach(() => appFixture.delete());

  describe('clear', () => {
    it('should clear all caches', async () => {
      const cache = appFixture.app.get(Cache);
      await cache.set('key1', 'value1');

      await cacheFixture.clear();

      const actual = await cache.get('key1');
      expect(actual).toBeUndefined();
    });
  });
});
