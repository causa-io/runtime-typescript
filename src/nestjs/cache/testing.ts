import type { AppFixture, Fixture } from '../testing.js';

/**
 * A fixture that clears all caches in the application.
 * It requires the `@nestjs/cache-manager` optional peer dependency.
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
    // `@nestjs/cache-manager` is only loaded when the fixture is used, such that importing the testing utilities does
    // not require it.
    const { Cache } = await import('@nestjs/cache-manager');
    await Promise.all(
      this.appFixture.app.get(Cache, { each: true }).map((c) => c.clear()),
    );
  }

  async delete(): Promise<void> {
    this.appFixture = undefined as any;
  }
}
