import { jest } from '@jest/globals';
import { Module } from '@nestjs/common';
import { EntityNotFoundError } from '../errors/entity.js';
import { AppFixture, type EventFixture } from '../nestjs/testing.js';
import { MockRunner, mockTransaction } from '../transaction/utils.test.js';
import { VersionedEntityFixture } from './testing.js';
import type { VersionedEntity } from './versioned-entity.js';

@Module({ providers: [MockRunner] })
class MyModule {}

class MyEntity implements VersionedEntity {
  constructor(init: MyEntity) {
    Object.assign(this, init);
  }

  readonly id!: string;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
  readonly deletedAt!: Date | null;
  readonly someValue!: string;
}

class MockEventFixture implements EventFixture {
  async expectEvent(): Promise<void> {}

  async expectNoEvent(): Promise<void> {}

  async init(): Promise<undefined> {}

  async clear(): Promise<void> {}

  async delete(): Promise<void> {}
}

describe('VersionedEntityFixture', () => {
  let appFixture: AppFixture;
  let eventFixture: MockEventFixture;
  let fixture: VersionedEntityFixture;

  beforeAll(async () => {
    eventFixture = new MockEventFixture();
    fixture = new VersionedEntityFixture(MockRunner, MockEventFixture);
    appFixture = new AppFixture(MyModule, {
      fixtures: [eventFixture, fixture],
    });
    await appFixture.init();
  });

  afterEach(async () => {
    await appFixture.clear();
    mockTransaction.clear();
  });

  afterAll(() => appFixture.delete());

  describe('expectMutated', () => {
    const expectedEntity = new MyEntity({
      id: '🆔',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      someValue: '💮',
    });

    it('should throw if the entity is not found', async () => {
      const actualPromise = fixture.expectMutated(
        { type: MyEntity, entity: { id: '🆔' } },
        { expectedEntity },
      );

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
    });

    it('should throw if the entity does not match the expected entity', async () => {
      await mockTransaction.set(
        new MyEntity({ ...expectedEntity, someValue: '💥' }),
      );

      const actualPromise = fixture.expectMutated(
        { type: MyEntity, entity: { id: '🆔' } },
        { expectedEntity },
      );

      await expect(actualPromise).rejects.toThrow('deep equality');
    });

    it('should accept a function to generate the expected entity', async () => {
      await mockTransaction.set(expectedEntity);
      const expectedEntityFn = jest.fn(() => expectedEntity);

      const actualEntity = await fixture.expectMutated(
        { type: MyEntity, entity: { id: '🆔' } },
        { expectedEntity: expectedEntityFn },
      );

      expect(expectedEntityFn).toHaveBeenCalledWith(expectedEntity);
      expect(actualEntity).toEqual(expectedEntity);
    });

    it('should check that an event has been published', async () => {
      await mockTransaction.set(expectedEntity);
      jest.spyOn(eventFixture, 'expectEvent').mockResolvedValue();

      await fixture.expectMutated(
        { type: MyEntity, entity: { id: '🆔' } },
        {
          expectedEntity,
          expectedEvent: {
            topic: 'my-topic',
            name: 'my-event',
            attributes: { someAttribute: '✨' },
          },
        },
      );

      expect(eventFixture.expectEvent).toHaveBeenCalledExactlyOnceWith(
        'my-topic',
        {
          // `id` is itself a matcher, so this doesn't test much.
          id: expect.any(String),
          name: 'my-event',
          producedAt: expectedEntity.updatedAt,
          data: expectedEntity,
        },
        { attributes: { someAttribute: '✨' } },
      );
    });

    it('should match the serialized entity against an expected HTTP response', async () => {
      await mockTransaction.set(expectedEntity);
      const expectedResponse = {
        id: '🆔',
        createdAt: expectedEntity.createdAt.toISOString(),
        updatedAt: expectedEntity.updatedAt.toISOString(),
        deletedAt: null,
        someValue: '💮',
      };

      await fixture.expectMutated(
        { type: MyEntity, entity: { id: '🆔' } },
        { expectedEntity, matchesHttpResponse: expectedResponse },
      );
      const actualPromise = fixture.expectMutated(
        { type: MyEntity, entity: { id: '🆔' } },
        {
          expectedEntity,
          matchesHttpResponse: { ...expectedResponse, createdAt: '🕰️' },
        },
      );

      await expect(actualPromise).rejects.toThrow('deep equality');
    });
  });

  describe('expectNoMutation', () => {
    const expectedEntity = new MyEntity({
      id: '🆔',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      someValue: '💮',
    });

    it('should throw if the entity is not found', async () => {
      const actualPromise = fixture.expectNoMutation(expectedEntity);

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
    });

    it('should throw if the entity has been mutated', async () => {
      await mockTransaction.set(
        new MyEntity({ ...expectedEntity, someValue: '💥' }),
      );

      const actualPromise = fixture.expectNoMutation(expectedEntity);

      await expect(actualPromise).rejects.toThrow('deep equality');
    });

    it('should check that no event has been published', async () => {
      await mockTransaction.set(expectedEntity);
      jest.spyOn(eventFixture, 'expectNoEvent').mockResolvedValue();

      await fixture.expectNoMutation(expectedEntity, {
        expectNoEventInTopic: 'my-topic',
      });

      expect(eventFixture.expectNoEvent).toHaveBeenCalledExactlyOnceWith(
        'my-topic',
      );
    });

    it('should match the serialized entity against an expected HTTP response', async () => {
      await mockTransaction.set(expectedEntity);
      const expectedResponse = {
        id: '🆔',
        createdAt: expectedEntity.createdAt.toISOString(),
        updatedAt: expectedEntity.updatedAt.toISOString(),
        deletedAt: null,
        someValue: '💮',
      };

      await fixture.expectNoMutation(expectedEntity, {
        matchesHttpResponse: expectedResponse,
      });
      const actualPromise = fixture.expectNoMutation(expectedEntity, {
        matchesHttpResponse: { ...expectedResponse, createdAt: '🕰️' },
      });

      await expect(actualPromise).rejects.toThrow('deep equality');
    });
  });
});
