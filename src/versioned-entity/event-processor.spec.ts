import { jest } from '@jest/globals';
import 'jest-extended';
import { EntityNotFoundError, OldEntityVersionError } from '../errors/index.js';
import type { Event } from '../events/index.js';
import {
  MockRunner,
  type MockTransaction,
  mockTransaction,
} from '../transaction/utils.test.js';
import type { KeyOfType } from '../typing/index.js';
import { VersionedEventProcessor } from './event-processor.js';
import type { VersionedEntity } from './versioned-entity.js';

class MyEntity implements VersionedEntity {
  constructor(data: Partial<MyEntity> = {}) {
    Object.assign(this, {
      id: '123',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      someProperty: '👋',
      ...data,
    });
  }

  id!: string;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  someProperty!: string;
}

type MyEvent = Event<
  string,
  {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    originalProperty: string;
  }
>;

const keyFn = jest.fn(
  (() => null) as (event: MyEvent) => Partial<MyEntity> | null,
);
const projectionFn = jest.fn(
  (async ({ data }) =>
    new MyEntity({
      id: data.id,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt,
      someProperty: data.originalProperty,
    })) as (
    event: MyEvent,
    transaction?: MockTransaction,
    options?: any,
  ) => Promise<MyEntity>,
);

export class MyProcessor extends VersionedEventProcessor<
  MockTransaction,
  MockTransaction,
  MyEvent,
  MyEntity,
  MockRunner
> {
  constructor(property: KeyOfType<MyEntity, Date> = 'updatedAt') {
    super(MyEntity, new MockRunner(), property);
  }

  protected stateKeyForEvent(event: MyEvent): Partial<MyEntity> | null {
    return keyFn(event);
  }

  project(
    event: MyEvent,
    transaction: MockTransaction,
    options: any,
  ): Promise<MyEntity> {
    return projectionFn(event, transaction, options);
  }
}

describe('VersionedEntityEventProcessor', () => {
  let processor: MyProcessor;

  beforeEach(() => {
    processor = new MyProcessor();
  });

  afterEach(() => {
    mockTransaction.clear();
  });

  describe('processEvent', () => {
    it('should update the state if the state does not exist', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-02'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      const expectedEntity = await projectionFn(event);
      projectionFn.mockClear();

      const actualProjection = await processor.processEvent(event);

      expect(actualProjection).toEqual(expectedEntity);
      expect(projectionFn).toHaveBeenCalledExactlyOnceWith(
        event,
        mockTransaction,
        {},
      );
      expect(mockTransaction.entities).toEqual({ '123': expectedEntity });
      expect(mockTransaction.entities['123']).toBeInstanceOf(MyEntity);
    });

    it('should not update the state if the event is older', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-01'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-01'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      const expectedEntity = new MyEntity({
        updatedAt: new Date('2020-01-02'),
      });
      mockTransaction.set(expectedEntity);

      const actualPromise = processor.processEvent(event);

      await expect(actualPromise).rejects.toThrow(OldEntityVersionError);
      await expect(actualPromise).rejects.toMatchObject({
        entityType: MyEntity,
        key: { id: '123' },
        stateVersion: expectedEntity.updatedAt,
        processedVersion: event.data.updatedAt,
      });
      expect(projectionFn).toHaveBeenCalledExactlyOnceWith(
        event,
        mockTransaction,
        {},
      );
      expect(mockTransaction.entities).toEqual({ '123': expectedEntity });
    });

    it('should not update the state if the event version is equal to the state version', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-02'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '🎉',
        },
      };
      const expectedEntity = new MyEntity({
        updatedAt: new Date('2020-01-02'),
      });
      mockTransaction.set(expectedEntity);

      const actualPromise = processor.processEvent(event);

      await expect(actualPromise).rejects.toThrow(OldEntityVersionError);
      await expect(actualPromise).rejects.toMatchObject({
        entityType: MyEntity,
        key: { id: '123' },
        stateVersion: expectedEntity.updatedAt,
        processedVersion: event.data.updatedAt,
      });
      expect(projectionFn).toHaveBeenCalledExactlyOnceWith(
        event,
        mockTransaction,
        {},
      );
      expect(mockTransaction.entities).toEqual({ '123': expectedEntity });
    });

    it('should update the state if the event is more recent', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-02'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      mockTransaction.set(new MyEntity({ updatedAt: new Date('2020-01-01') }));
      const expectedEntity = await projectionFn(event);
      projectionFn.mockClear();

      const actualProjection = await processor.processEvent(event);

      expect(actualProjection).toEqual(expectedEntity);
      expect(projectionFn).toHaveBeenCalledExactlyOnceWith(
        event,
        mockTransaction,
        {},
      );
      expect(mockTransaction.entities).toEqual({ '123': expectedEntity });
      expect(mockTransaction.entities['123']).toBeInstanceOf(MyEntity);
    });

    it('should update the state if the event has the same version as the state but reprocessing is enabled', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-02'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '🎉',
        },
      };
      mockTransaction.set(new MyEntity({ updatedAt: new Date('2020-01-02') }));
      const expectedEntity = await projectionFn(event);
      projectionFn.mockClear();

      const actualProjection = await processor.processEvent(event, {
        reprocessEqualVersion: true,
      });

      expect(actualProjection).toEqual(expectedEntity);
      expect(projectionFn).toHaveBeenCalledExactlyOnceWith(
        event,
        mockTransaction,
        {},
      );
      expect(mockTransaction.entities).toEqual({ '123': expectedEntity });
      expect(mockTransaction.entities['123']).toBeInstanceOf(MyEntity);
    });

    it('should check the state using the provided entity and update the state', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-02'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      const expectedEntity = await projectionFn(event);
      const existingEntity = new MyEntity({
        updatedAt: new Date('2020-01-03'),
      });
      projectionFn.mockClear();
      mockTransaction.set(existingEntity);
      // Although the existing entity is newer, the processor should use the provided existing state for its check.
      const entityInTransaction = new MyEntity({
        ...existingEntity,
        updatedAt: new Date('2020-01-01'),
      });

      const actualProjection = await processor.processEvent(event, {
        existingState: entityInTransaction,
      });

      expect(actualProjection).toEqual(expectedEntity);
      expect(projectionFn).toHaveBeenCalledExactlyOnceWith(
        event,
        mockTransaction,
        {},
      );
      expect(mockTransaction.entities).toEqual({ '123': expectedEntity });
      expect(mockTransaction.entities['123']).toBeInstanceOf(MyEntity);
    });

    it('should fetch the state first when stateKeyForEvent returns a key', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-02'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      const expectedExistingState = new MyEntity({
        updatedAt: new Date('2020-01-01'),
      });
      mockTransaction.set(expectedExistingState);
      const expectedEntity = await projectionFn(event);
      projectionFn.mockClear();
      keyFn.mockReturnValueOnce({ id: '123' });

      const actualProjection = await processor.processEvent(event);

      expect(actualProjection).toEqual(expectedEntity);
      expect(projectionFn).toHaveBeenCalledExactlyOnceWith(
        event,
        mockTransaction,
        { state: expectedExistingState },
      );
      expect(mockTransaction.entities).toEqual({ '123': expectedEntity });
      expect(mockTransaction.entities['123']).toBeInstanceOf(MyEntity);
    });
  });

  describe('processOrSkipEvent', () => {
    it('should not update the state if the event is older', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-01'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-01'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      const expectedEntity = new MyEntity({
        updatedAt: new Date('2020-01-02'),
      });
      mockTransaction.set(expectedEntity);

      const actualProjection = await processor.processOrSkipEvent(event);

      expect(actualProjection).toBeNull();
      expect(projectionFn).toHaveBeenCalledExactlyOnceWith(
        event,
        mockTransaction,
        {},
      );
      expect(mockTransaction.entities).toEqual({ '123': expectedEntity });
    });

    it('should update the state if the event is more recent', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-02'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      const expectedEntity = await projectionFn(event);
      projectionFn.mockClear();

      const actualProjection = await processor.processOrSkipEvent(event);

      expect(actualProjection).toEqual(expectedEntity);
      expect(projectionFn).toHaveBeenCalledExactlyOnceWith(
        event,
        mockTransaction,
        {},
      );
      expect(mockTransaction.entities).toEqual({ '123': expectedEntity });
      expect(mockTransaction.entities['123']).toBeInstanceOf(MyEntity);
    });
  });

  describe('updateState', () => {
    it('should allow overriding the updateState method', async () => {
      const updateStateSpy = jest.fn();
      class MyOtherProcessor extends MyProcessor {
        async updateState(
          projection: MyEntity,
          transaction: MockTransaction,
        ): Promise<void> {
          updateStateSpy(projection, transaction);
        }
      }
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-02'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      const expectedEntity = await projectionFn(event);
      const processor = new MyOtherProcessor();

      const actualProjection = await processor.processEvent(event);

      expect(actualProjection).toEqual(expectedEntity);
      expect(updateStateSpy).toHaveBeenCalledExactlyOnceWith(
        expectedEntity,
        mockTransaction,
      );
      expect(updateStateSpy.mock.calls[0][0]).toBeInstanceOf(MyEntity);
    });
  });

  describe('projectionVersionColumn', () => {
    it('should use a custom version column', async () => {
      class MyOtherProcessor extends MyProcessor {
        // This doesn't make much sense, but it makes sure a different date column is used.
        constructor() {
          super('createdAt');
        }
      }
      const processor = new MyOtherProcessor();
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-01'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      const expectedEntity = new MyEntity({
        // `createdAt` is newer in the state, which should prevent the update.
        createdAt: new Date('2020-01-02'),
        updatedAt: new Date('2020-01-01'),
      });
      mockTransaction.set(expectedEntity);

      const actualPromise = processor.processEvent(event);

      await expect(actualPromise).rejects.toThrow(OldEntityVersionError);
      await expect(actualPromise).rejects.toMatchObject({
        entityType: MyEntity,
        key: { id: '123' },
        stateVersion: expectedEntity.createdAt,
        processedVersion: event.data.createdAt,
      });
      expect(projectionFn).toHaveBeenCalledExactlyOnceWith(
        event,
        mockTransaction,
        {},
      );
      expect(mockTransaction.entities).toEqual({ '123': expectedEntity });
    });
  });

  describe('get', () => {
    it('should throw EntityNotFound for a projection that does not exist', async () => {
      const actualPromise = processor.get({ id: '123' });

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
      await expect(actualPromise).rejects.toMatchObject({
        entityType: MyEntity,
        key: { id: '123' },
      });
    });

    it('should return the projection if it exists', async () => {
      const expectedEntity = new MyEntity({ id: '123' });
      mockTransaction.set(expectedEntity);
      jest.spyOn(processor.runner, 'runReadOnly');

      const actualProjection = await processor.get({ id: '123' });

      expect(actualProjection).toEqual(expectedEntity);
      expect(processor.runner.runReadOnly).toHaveBeenCalledOnce();
    });

    it('should use the provided transaction', async () => {
      const expectedEntity = new MyEntity({ id: '123' });
      mockTransaction.set(expectedEntity);
      jest.spyOn(processor.runner, 'runReadWrite');

      const actualProjection = await processor.get(
        { id: '123' },
        { transaction: mockTransaction },
      );

      expect(actualProjection).toEqual(expectedEntity);
      expect(processor.runner.runReadWrite).not.toHaveBeenCalled();
    });
  });
});
