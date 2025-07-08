import type {
  INestApplication,
  NestApplicationOptions,
  Type,
} from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import supertest from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { LoggingFixture } from '../logging/testing.js';
import { ConfigFixture } from './config-fixture.js';
import { createAppModule } from './create.js';

/**
 * A function that overrides providers in a {@link TestingModuleBuilder}.
 */
export type NestJsModuleOverrider = (
  builder: TestingModuleBuilder,
) => TestingModuleBuilder;

/**
 * A fixture that can be included in an {@link AppFixture}.
 */
export interface Fixture {
  /**
   * Initializes the fixture and returns providers overrides.
   * This is called only once, before the application is initialized.
   *
   * @returns A function that overrides providers in the testing module.
   */
  init(appFixture: AppFixture): Promise<NestJsModuleOverrider | undefined>;

  /**
   * Clears the fixture, e.g. by resetting the state of a database.
   * This is called as part of {@link AppFixture.clear}.
   */
  clear(): Promise<void>;

  /**
   * Deletes the fixture, e.g. by dropping a database or removing files.
   * This is called as part of {@link AppFixture.delete}.
   * It is called after the application is closed.
   */
  delete(): Promise<void>;
}

/**
 * The state of an {@link AppFixture}.
 */
enum AppFixtureState {
  /**
   * The app fixture has been created, but not yet initialized.
   */
  Uninitialized,

  /**
   * The app fixture is active, meaning the application has been initialized and the fixtures are ready to be used.
   */
  Active,

  /**
   * The app fixture has been deleted, meaning the application has been closed and all fixtures have been deleted.
   */
  Deleted,
}

/**
 * A fixture that initializes a NestJS application and a set of fixtures linked to the application.
 */
export class AppFixture {
  /**
   * The NestJS application created from the provided module.
   * This is only available after {@link AppFixture.init} has been called.
   */
  readonly app!: INestApplication;

  /**
   * The request agent used to make HTTP requests to the application.
   * This is only available after {@link AppFixture.init} has been called.
   */
  readonly request!: TestAgent;

  /**
   * The fixtures that will be initialized with the application.
   */
  private readonly fixtures: Fixture[];

  /**
   * The options passed to the NestJS application when it is created.
   */
  readonly nestApplicationOptions: NestApplicationOptions;

  /**
   * The current state of the app fixture.
   */
  private state: AppFixtureState = AppFixtureState.Uninitialized;

  /**
   * Creates a new {@link AppFixture} that initializes a NestJS application with the given module.
   *
   * @param appModule The root module of the business application.
   * @param options Options for the fixture.
   */
  constructor(
    readonly appModule: any,
    options: {
      /**
       * A list of fixtures that will be initialized with the application.
       */
      fixtures?: Fixture[];

      /**
       * Options to pass to the NestJS application when it is created.
       */
      nestApplicationOptions?: NestApplicationOptions;

      /**
       * A dictionary of configuration values (e.g. environment variables) that will be used to initialize the
       * {@link ConfigFixture}. Do not pass this if a {@link ConfigFixture} is already included in the `fixtures`.
       */
      config?: Record<string, any>;
    } = {},
  ) {
    this.fixtures = options.fixtures ?? [];
    this.nestApplicationOptions = options.nestApplicationOptions ?? {};

    if (options.config) {
      if (this.fixtures.some((f) => f instanceof ConfigFixture)) {
        throw new Error(
          'Configuration was passed both as a fixture and as an object.',
        );
      }

      this.fixtures.push(new ConfigFixture(options.config));
    }

    if (!this.fixtures.some((f) => f instanceof LoggingFixture)) {
      this.fixtures.push(new LoggingFixture());
    }
  }

  /**
   * Adds a fixture to the application.
   * This can only be called before the application is initialized.
   *
   * @param fixture The fixture to add to the application.
   */
  add(fixture: Fixture): void {
    if (this.state !== AppFixtureState.Uninitialized) {
      throw new Error('Cannot add fixture after initialization.');
    }

    this.fixtures.push(fixture);
  }

  /**
   * Gets an instance of a provider from the application.
   * This can be a service, controller, or any other provider registered in the application.
   * If the a fixture class is passed, it will return the instance of the fixture.
   *
   * @param typeOrToken The type or token of the provider to get.
   * @returns The instance of the provider, or an array of instances if `options.each` is set to `true`.
   */
  get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
  ): TResult;

  /**
   * Gets an array of instances of a provider from the application.
   *
   * @param typeOrToken The type or token of the provider to get.
   * @param options Options for getting the provider.
   * @returns An array of instances of the provider.
   */
  get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    options: {
      /**
       * If set to `true`, returns an array of instances of the provider.
       */
      each: true;
    },
  ): Array<TResult>;

  get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | string | symbol,
    options?: { each: true },
  ): TResult | Array<TResult> {
    if (typeof typeOrToken === 'function' && !options) {
      const fixture = this.fixtures.find((f) => f instanceof typeOrToken);
      if (fixture) {
        return fixture as any;
      }
    }

    if (this.state !== AppFixtureState.Active) {
      throw new Error('Cannot get instance when fixture is not active.');
    }

    return this.app.get(typeOrToken, options);
  }

  /**
   * Initializes the application and all fixtures.
   * This should only be called once, before tests.
   */
  async init(): Promise<void> {
    if (this.state !== AppFixtureState.Uninitialized) {
      throw new Error('Cannot initialize the application more than once.');
    }
    this.state = AppFixtureState.Active;

    let builder = Test.createTestingModule({
      imports: [createAppModule(this.appModule)],
    });

    const overrides = await Promise.all(this.fixtures.map((f) => f.init(this)));
    overrides.filter((o) => !!o).forEach((o) => (builder = o(builder)));

    const moduleRef = await builder.compile();

    (this as any).app = moduleRef.createNestApplication(
      this.nestApplicationOptions,
    );
    await this.app.init();

    (this as any).request = supertest(this.app.getHttpServer());
  }

  /**
   * Clears all fixtures.
   * This is useful to reset the state of the application between tests.
   */
  async clear(): Promise<void> {
    if (this.state !== AppFixtureState.Active) {
      throw new Error('Cannot clear fixtures that are not active.');
    }

    const result = await Promise.allSettled(
      this.fixtures.map((fixture) => fixture.clear()),
    );
    const error = result.find((r) => r.status === 'rejected');
    if (error) {
      throw error.reason;
    }
  }

  /**
   * Closes the application and deletes all fixtures.
   */
  async delete(): Promise<void> {
    if (this.state !== AppFixtureState.Active) {
      throw new Error('Cannot delete fixtures that are not active.');
    }
    this.state = AppFixtureState.Deleted;

    await this.app.close();

    const result = await Promise.allSettled(
      this.fixtures.map((fixture) => fixture.delete()),
    );
    const error = result.find((r) => r.status === 'rejected');
    if (error) {
      throw error.reason;
    }
  }
}
