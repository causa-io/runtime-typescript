import { Cache } from '@nestjs/cache-manager';
import type { AppFixture, Fixture } from '../testing.js';

/**
 * A fixture that clears all caches in the application.
 */
export class CacheFixture implements Fixture {
  /**
   * The parent application fixture.
   */
  private appFixture!: AppFixture;

  async init(appFixture: AppFixture): Promise<undefined> {
    this.appFixture = appFixture;
  }

  async clear(): Promise<void> {
    await Promise.all(
      this.appFixture.app.get(Cache, { each: true }).map((c) => c.clear()),
    );
  }

  async delete(): Promise<void> {
    this.appFixture = undefined as any;
  }
}
