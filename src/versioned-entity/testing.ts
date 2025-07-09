import type { Type } from '@nestjs/common';
import { EntityNotFoundError } from '../errors/entity.js';
import type { AppFixture, EventFixture, Fixture } from '../nestjs/testing.js';
import { serializeAsJavaScriptObject } from '../serialization/testing.js';
import type {
  ReadOnlyStateTransaction,
  Transaction,
  TransactionRunner,
} from '../transaction/index.js';
import type { VersionedEntity } from './versioned-entity.js';

/**
 * Describes an entity to fetch from the state.
 * Used by expect methods in {@link VersionedEntityFixture}.
 */
type EntityToFetch<T extends object> = {
  /**
   * The type of entity to fetch.
   */
  type: Type<T>;

  /**
   * The partial entity containing the primary key to fetch.
   */
  entity: Partial<T>;
};

/**
 * Describes tests to run on a versioned entity stored in the state.
 */
type VersionedEntityTests<T extends object> = {
  /**
   * The expected entity after mutation.
   * It is checked against the actual entity in the database using `toEqual`, which means it can contain matchers.
   * A function can be provided to generate the expected entity from the actual entity.
   */
  expectedEntity: ((actual: T) => T) | T;

  /**
   * If set, checks that an event has been published to the corresponding topic with the entity as `data`.
   */
  expectedEvent?: {
    /**
     * The name of the topic.
     */
    topic: string;

    /**
     * The `name` of the expected published event.
     */
    name: string;

    /**
     * Attributes expected to have been set on the published event.
     */
    attributes?: Record<string, string>;
  };

  /**
   * If set, the passed object is checked to be equal to a "plain object" (e.g. with `Date`s converted to `string`s)
   * version of the fetched entity.
   * This can contain a parsed HTTP response body which is expected to return the entity.
   *
   * {@link serializeAsJavaScriptObject} is used to serialize the fetched entity.
   */
  matchesHttpResponse?: object;
};

/**
 * A fixture for testing mutations of versioned entities.
 */
export class VersionedEntityFixture implements Fixture {
  /**
   * The parent application fixture.
   */
  private appFixture!: AppFixture;

  /**
   * The runner to use when fetching entities from the state.
   */
  private runner!: TransactionRunner<Transaction, ReadOnlyStateTransaction>;

  /**
   * The event fixture to use when checking events published by the application.
   */
  private eventFixture!: EventFixture;

  /**
   * Creates a new {@link VersionedEntityFixture} instance.
   *
   * @param runnerType The type of the transaction runner to use for fetching entities from the state.
   * @param eventFixtureType The type of the event fixture to use for checking events published by the application.
   */
  constructor(
    private readonly runnerType: Type<
      TransactionRunner<Transaction, ReadOnlyStateTransaction>
    >,
    private readonly eventFixtureType: Type<EventFixture>,
  ) {}

  async init(appFixture: AppFixture): Promise<undefined> {
    this.appFixture = appFixture;
    this.eventFixture = appFixture.get(this.eventFixtureType);
  }

  async clear(): Promise<void> {}

  async delete(): Promise<void> {
    this.appFixture = undefined as any;
  }

  /**
   * Fetches an entity from the state, or throws an {@link EntityNotFoundError}.
   *
   * @param entity Describes the entity to fetch in the state.
   * @returns The entity fetched from the state.
   */
  private async get<T extends object>({
    type,
    entity,
  }: EntityToFetch<T>): Promise<T> {
    if (!this.runner) {
      this.runner = this.appFixture.get(this.runnerType);
    }

    const storedEntity = await this.runner.run(
      { readOnly: true },
      (transaction) => transaction.get(type, entity),
    );
    if (!storedEntity) {
      throw new EntityNotFoundError(type, entity);
    }
    return storedEntity;
  }

  /**
   * Runs a test on a versioned entity, checking that it has been mutated as expected.
   * Optionally, checks that an event has been published to the corresponding topic.
   * Also, a serialized version of the entity (e.g. an HTTP response) can be checked against the expected entity.
   *
   * @param entity Describes the entity to fetch in the state.
   * @param tests The tests to run on the entity and its event.
   * @returns The entity fetched from the database.
   */
  async expectMutated<T extends Pick<VersionedEntity, 'updatedAt'>>(
    entity: EntityToFetch<T>,
    tests: VersionedEntityTests<T>,
  ): Promise<T> {
    const storedEntity = await this.get(entity);

    const expectedEntity =
      typeof tests.expectedEntity === 'function'
        ? tests.expectedEntity(storedEntity)
        : tests.expectedEntity;
    expect(storedEntity).toEqual(expectedEntity);

    const { expectedEvent } = tests;
    if (expectedEvent) {
      await this.eventFixture.expectEvent(
        expectedEvent.topic,
        {
          id: expect.any(String),
          name: expectedEvent.name,
          producedAt: storedEntity.updatedAt,
          data: storedEntity,
        },
        { attributes: expectedEvent.attributes },
      );
    }

    if (tests.matchesHttpResponse) {
      const expectedResponse = await serializeAsJavaScriptObject(storedEntity);
      expect(tests.matchesHttpResponse).toEqual(expectedResponse);
    }

    return storedEntity;
  }

  /**
   * Ensures the specified entity has not been mutated.
   * Optionally, checks that no event has been published to the corresponding topic.
   * Also, a serialized version of the entity (e.g. an HTTP response) can be checked against the expected entity.
   *
   * @param entity The entity expected to be found in the state.
   * @param tests The tests to run on the entity.
   */
  async expectNoMutation<T extends Pick<VersionedEntity, 'updatedAt'>>(
    entity: T,
    tests: Pick<VersionedEntityTests<T>, 'matchesHttpResponse'> & {
      /**
       * If set, checks that no event has been published to the corresponding topic.
       */
      expectNoEventInTopic?: string;
    } = {},
  ): Promise<void> {
    const type = entity.constructor as Type<T>;
    const storedEntity = await this.get({ type, entity });

    expect(storedEntity).toEqual(entity);

    if (tests.expectNoEventInTopic) {
      await this.eventFixture.expectNoEvent(tests.expectNoEventInTopic);
    }

    if (tests.matchesHttpResponse) {
      const expectedResponse = await serializeAsJavaScriptObject(storedEntity);
      expect(tests.matchesHttpResponse).toEqual(expectedResponse);
    }
  }
}
