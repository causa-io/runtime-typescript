import { jest } from '@jest/globals';
import 'jest-extended';
import {
  EntityAlreadyExistsError,
  EntityNotFoundError,
  IncorrectEntityVersionError,
  UnsupportedEntityOperationError,
} from '../errors/index.js';
import type { Event } from '../events/index.js';
import {
  Transaction,
  TransactionOldTimestampError,
} from '../transaction/index.js';
import { MockRunner, mockTransaction } from '../transaction/utils.test.js';
import { VersionedEntityManager } from './manager.js';
import type { VersionedEntity } from './versioned-entity.js';

class MyEntity implements VersionedEntity {
  constructor(data: Partial<MyEntity> = {}) {
    Object.assign(this, {
      id: '123',
      createdAt: new Date('2020-01-01'),
      updatedAt: new Date('2020-01-01'),
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

class MyEvent implements Event<string, MyEntity> {
  constructor(data: Partial<MyEvent> = {}) {
    Object.assign(this, {
      id: '123',
      producedAt: new Date(),
      name: '✨',
      data: new MyEntity(),
      ...data,
    });
  }

  id!: string;
  producedAt!: Date;
  name!: string;
  data!: MyEntity;
}

class MySimpleEntity {
  constructor(data: Partial<MySimpleEntity> = {}) {
    Object.assign(this, {
      id: '123',
      updatedAt: new Date('2020-01-01'),
      someProperty: '👋',
      ...data,
    });
  }

  id!: string;
  updatedAt!: Date;
  someProperty!: string;
}

class MySimpleEvent implements Event<string, MySimpleEntity> {
  constructor(data: Partial<MySimpleEvent> = {}) {
    Object.assign(this, {
      id: '123',
      producedAt: new Date(),
      name: '✨',
      data: new MySimpleEntity(),
      ...data,
    });
  }

  id!: string;
  producedAt!: Date;
  name!: string;
  data!: MySimpleEntity;
}

describe('VersionedEntityManager', () => {
  let manager: VersionedEntityManager<
    Transaction,
    Transaction,
    MyEvent,
    MockRunner
  >;

  beforeEach(() => {
    manager = new VersionedEntityManager(
      'my-topic',
      MyEvent,
      MyEntity,
      new MockRunner(),
    );
  });

  afterEach(() => {
    mockTransaction.clear();
  });

  function expectPublishedEvent(
    event: object,
    attributes: Record<string, any> = {},
  ) {
    expect(mockTransaction.events).toEqual([
      {
        id: expect.any(String),
        topic: 'my-topic',
        data: event,
        attributes,
      },
    ]);
  }

  describe('get', () => {
    it('should fail if the entity does not exist', async () => {
      const actualPromise = manager.get({ id: 'abc' });

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
      await expect(actualPromise).rejects.toMatchObject({
        entityType: MyEntity,
        key: { id: 'abc' },
      });
    });

    it('should fail if the entity is soft-deleted', async () => {
      const existingEntity = new MyEntity({
        id: 'abc',
        deletedAt: new Date('2020-01-01'),
      });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.get({ id: 'abc' });

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
      await expect(actualPromise).rejects.toMatchObject({
        entityType: MyEntity,
        key: { id: 'abc' },
      });
    });

    it('should throw a custom error', async () => {
      jest
        .spyOn(manager as any, 'throwNotFoundError')
        .mockImplementationOnce(() => {
          throw new Error('😢');
        });

      const actualPromise = manager.get({ id: '123' });

      await expect(actualPromise).rejects.toThrow('😢');
    });

    it('should return the entity if it exists', async () => {
      const expectedEntity = new MyEntity({ id: 'abc' });
      mockTransaction.set(expectedEntity);

      const actualEntity = await manager.get({ id: 'abc' });

      expect(actualEntity).toEqual(expectedEntity);
    });
  });

  describe('create', () => {
    it('should fail if the entity already exists', async () => {
      const existingEntity = new MyEntity({ id: 'abc' });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.create('myEntityCreated', {
        id: 'abc',
        someProperty: '🎉',
      });

      await expect(actualPromise).rejects.toThrow(EntityAlreadyExistsError);
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should fail if the entity is soft-deleted but the transaction timestamp is older', async () => {
      const existingEntity = new MyEntity({
        id: 'abc',
        updatedAt: new Date('2999-01-01'),
        deletedAt: new Date('2999-01-01'),
      });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.create('myEntityCreated', {
        id: 'abc',
        someProperty: '🎉',
      });

      await expect(actualPromise).rejects.toThrow(TransactionOldTimestampError);
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should create the entity', async () => {
      const actualEvent = await manager.create('myEntityCreated', {
        id: 'abc',
        someProperty: '🎉',
      });

      expect(actualEvent).toBeInstanceOf(MyEvent);
      expect(actualEvent).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          producedAt: mockTransaction.timestamp,
          name: 'myEntityCreated',
          data: {
            id: 'abc',
            createdAt: mockTransaction.timestamp,
            updatedAt: mockTransaction.timestamp,
            deletedAt: null,
            someProperty: '🎉',
          },
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockTransaction.entities).toEqual({ abc: actualEvent.data });
      expectPublishedEvent(actualEvent);
    });

    it('should create the entity if it is soft-deleted', async () => {
      mockTransaction.set(
        new MyEntity({ id: 'abc', deletedAt: new Date('2023-01-01') }),
      );

      const actualEvent = await manager.create('myEntityCreated', {
        id: 'abc',
        someProperty: '🎉',
      });

      expect(actualEvent).toBeInstanceOf(MyEvent);
      expect(actualEvent).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          producedAt: mockTransaction.timestamp,
          name: 'myEntityCreated',
          data: {
            id: 'abc',
            createdAt: mockTransaction.timestamp,
            updatedAt: mockTransaction.timestamp,
            deletedAt: null,
            someProperty: '🎉',
          },
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockTransaction.entities).toEqual({ abc: actualEvent.data });
      expectPublishedEvent(actualEvent);
    });

    it('should accept options', async () => {
      jest.spyOn(manager.runner, 'runReadWrite');

      const actualEvent = await manager.create(
        'myEntityCreated',
        {
          id: 'abc',
          someProperty: '🎉',
        },
        {
          transaction: mockTransaction,
          publishOptions: { attributes: { att1: '🎁' } },
        },
      );

      expect(manager.runner.runReadWrite).not.toHaveBeenCalled();
      expectPublishedEvent(actualEvent, { att1: '🎁' });
    });
  });

  describe('update', () => {
    it('should fail if the entity does not exists', async () => {
      const actualPromise = manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
      );

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
      expect(mockTransaction.entities).toEqual({});
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should fail if the entity is soft-deleted', async () => {
      const existingEntity = new MyEntity({
        id: 'abc',
        deletedAt: new Date('2020-01-01'),
      });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
      );

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should throw a custom error', async () => {
      jest
        .spyOn(manager as any, 'throwNotFoundError')
        .mockImplementationOnce(() => {
          throw new Error('😢');
        });

      const actualPromise = manager.update(
        'myEntityUpdated',
        { id: '123' },
        { someProperty: '🔖' },
      );

      await expect(actualPromise).rejects.toThrow('😢');
    });

    it('should fail if the version timestamps do not match', async () => {
      const existingEntity = new MyEntity({
        id: 'abc',
        updatedAt: new Date('2020-01-01'),
      });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
        { checkUpdatedAt: new Date('2020-01-02') },
      );

      await expect(actualPromise).rejects.toThrow(IncorrectEntityVersionError);
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should fail if the state is more recent than the transaction timestamp', async () => {
      const existingEntity = new MyEntity({
        id: 'abc',
        updatedAt: new Date('2999-01-01'),
      });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
      );

      await expect(actualPromise).rejects.toThrow(TransactionOldTimestampError);
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should update the entity', async () => {
      const existingEntity = new MyEntity({ id: 'abc' });
      mockTransaction.set(existingEntity);
      const validationFn = jest.fn(() => Promise.resolve());

      const actualEvent = await manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
        { validationFn, checkUpdatedAt: existingEntity.updatedAt },
      );

      expect(actualEvent).toBeInstanceOf(MyEvent);
      expect(actualEvent).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          producedAt: mockTransaction.timestamp,
          name: 'myEntityUpdated',
          data: {
            ...existingEntity,
            updatedAt: mockTransaction.timestamp,
            someProperty: '🔖',
          },
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockTransaction.entities).toEqual({ abc: actualEvent.data });
      expectPublishedEvent(actualEvent);
      expect(validationFn).toHaveBeenCalledExactlyOnceWith(
        existingEntity,
        mockTransaction,
      );
    });

    it('should use a function as the update', async () => {
      const existingEntity = new MyEntity({ id: 'abc' });
      mockTransaction.set(existingEntity);

      const actualEvent = await manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        async (existingEntity, transaction) => ({
          someProperty: `${
            existingEntity.id
          } ${transaction.timestamp.toISOString()}`,
        }),
      );

      expect(actualEvent).toBeInstanceOf(MyEvent);
      expect(actualEvent).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          producedAt: mockTransaction.timestamp,
          name: 'myEntityUpdated',
          data: {
            ...existingEntity,
            updatedAt: mockTransaction.timestamp,
            someProperty: `abc ${mockTransaction.timestamp.toISOString()}`,
          },
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockTransaction.entities).toEqual({ abc: actualEvent.data });
      expectPublishedEvent(actualEvent);
    });

    it('should rethrow an error from the validation function', async () => {
      const existingEntity = new MyEntity({ id: 'abc' });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
        { validationFn: () => Promise.reject(new Error('🔥')) },
      );

      await expect(actualPromise).rejects.toThrow('🔥');
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should prioritize the validation function over the checkUpdatedAt option', async () => {
      const existingEntity = new MyEntity({
        id: 'abc',
        updatedAt: new Date('2020-01-01'),
      });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
        {
          validationFn: () => Promise.reject(new Error('🔥')),
          checkUpdatedAt: new Date('2020-01-02'),
        },
      );

      await expect(actualPromise).rejects.toThrow('🔥');
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should accept options', async () => {
      jest.spyOn(manager.runner, 'runReadWrite');
      const existingEntity = new MyEntity({ id: 'abc' });
      // The existing entity is not set in the transaction entities, and `update` should only use the provided option.

      const actualEvent = await manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
        {
          transaction: mockTransaction,
          publishOptions: { attributes: { att1: '🎁' } },
          existingEntity,
        },
      );

      expect(manager.runner.runReadWrite).not.toHaveBeenCalled();
      expectPublishedEvent(actualEvent, { att1: '🎁' });
    });

    it('should use the provided custom update logic', async () => {
      class MyManager extends VersionedEntityManager<
        Transaction,
        Transaction,
        MyEvent,
        MockRunner
      > {
        protected makeUpdatedObject(
          existingEntity: MyEntity,
          update: Partial<MyEntity>,
        ): MyEntity {
          return {
            ...existingEntity,
            ...update,
            someProperty: `${existingEntity.someProperty} 📝`,
          };
        }
      }
      manager = new MyManager('my-topic', MyEvent, MyEntity, new MockRunner());
      const existingEntity = new MyEntity({ id: 'abc', someProperty: '👋' });
      mockTransaction.set(existingEntity);

      const actualEvent = await manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🙈' },
      );

      expect(actualEvent).toBeInstanceOf(MyEvent);
      expect(actualEvent).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          producedAt: mockTransaction.timestamp,
          name: 'myEntityUpdated',
          data: {
            ...existingEntity,
            updatedAt: mockTransaction.timestamp,
            someProperty: '👋 📝',
          },
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockTransaction.entities).toEqual({ abc: actualEvent.data });
      expectPublishedEvent(actualEvent);
    });
  });

  describe('delete', () => {
    it('should fail if the entity does not exists', async () => {
      const actualPromise = manager.delete('myEntityDeleted', { id: 'abc' });

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
      expect(mockTransaction.entities).toEqual({});
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should fail if the entity is soft-deleted', async () => {
      const existingEntity = new MyEntity({
        id: 'abc',
        deletedAt: new Date('2020-01-01'),
      });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.delete('myEntityDeleted', { id: 'abc' });

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should fail if the version timestamps do not match', async () => {
      const existingEntity = new MyEntity({
        id: 'abc',
        updatedAt: new Date('2020-01-01'),
      });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.delete(
        'myEntityDeleted',
        { id: 'abc' },
        { checkUpdatedAt: new Date('2020-01-02') },
      );

      await expect(actualPromise).rejects.toThrow(IncorrectEntityVersionError);
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should fail if the state is more recent than the transaction timestamp', async () => {
      const existingEntity = new MyEntity({
        id: 'abc',
        updatedAt: new Date('2999-01-01'),
      });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.delete('myEntityDeleted', { id: 'abc' });

      await expect(actualPromise).rejects.toThrow(TransactionOldTimestampError);
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should delete the entity', async () => {
      const existingEntity = new MyEntity({ id: 'abc' });
      mockTransaction.set(existingEntity);
      const validationFn = jest.fn(() => Promise.resolve());

      const actualEvent = await manager.delete(
        'myEntityDeleted',
        { id: 'abc', someProperty: '🙈' },
        { validationFn, checkUpdatedAt: existingEntity.updatedAt },
      );

      expect(actualEvent).toBeInstanceOf(MyEvent);
      expect(actualEvent).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          producedAt: mockTransaction.timestamp,
          name: 'myEntityDeleted',
          data: {
            ...existingEntity,
            updatedAt: mockTransaction.timestamp,
            deletedAt: mockTransaction.timestamp,
          },
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockTransaction.entities).toEqual({ abc: actualEvent.data });
      expectPublishedEvent(actualEvent);
      expect(validationFn).toHaveBeenCalledExactlyOnceWith(
        existingEntity,
        mockTransaction,
      );
    });

    it('should rethrow an error from the validation function', async () => {
      const existingEntity = new MyEntity({ id: 'abc' });
      mockTransaction.set(existingEntity);

      const actualPromise = manager.delete(
        'myEntityDeleted',
        { id: 'abc' },
        { validationFn: () => Promise.reject(new Error('🔥')) },
      );

      await expect(actualPromise).rejects.toThrow('🔥');
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should accept options', async () => {
      jest.spyOn(manager.runner, 'runReadWrite');
      const existingEntity = new MyEntity({ id: 'abc' });
      // The existing entity is not set in the transaction entities, and `delete` should only use the provided option.

      const actualEvent = await manager.delete(
        'myEntityDeleted',
        { id: 'abc' },
        {
          transaction: mockTransaction,
          publishOptions: { attributes: { att1: '🎁' } },
          existingEntity,
        },
      );

      expect(manager.runner.runReadWrite).not.toHaveBeenCalled();
      expectPublishedEvent(actualEvent, { att1: '🎁' });
    });
  });

  describe('without creation and deletion timestamps', () => {
    let manager: VersionedEntityManager<
      Transaction,
      Transaction,
      MySimpleEvent
    >;

    beforeEach(() => {
      manager = new VersionedEntityManager(
        'my-topic',
        MySimpleEvent,
        MySimpleEntity,
        new MockRunner(),
        {
          hasCreationTimestampProperty: false,
          hasDeletionTimestampProperty: false,
        },
      );
    });

    it('should get a soft-deleted entity', async () => {
      const existingEntity = new MySimpleEntity({
        id: 'abc',
        deletedAt: new Date('2020-01-01'),
      } as any);
      mockTransaction.set(existingEntity);

      const actualEntity = await manager.get({ id: 'abc' });

      expect(actualEntity).toEqual(existingEntity);
    });

    it('should create the entity without creation and deletion timestamp', async () => {
      const actualEvent = await manager.create('myEntityCreated', {
        id: 'abc',
        someProperty: '🎉',
      });

      expect(actualEvent).toBeInstanceOf(MySimpleEvent);
      expect(actualEvent).toEqual({
        id: expect.any(String),
        producedAt: mockTransaction.timestamp,
        name: 'myEntityCreated',
        data: {
          id: 'abc',
          updatedAt: mockTransaction.timestamp,
          someProperty: '🎉',
        },
      });
      expect(actualEvent.data).toBeInstanceOf(MySimpleEntity);
      expect(mockTransaction.entities).toEqual({ abc: actualEvent.data });
      expectPublishedEvent(actualEvent);
    });

    it('should fail creation if the entity already exists', async () => {
      const existingEntity = new MySimpleEntity({
        id: 'abc',
        // Although there is a `deletedAt` property, it should not be taken into account when checking for existence.
        deletedAt: new Date(),
      } as any);
      mockTransaction.set(existingEntity);

      const actualPromise = manager.create('myEntityCreated', {
        id: 'abc',
        someProperty: '🎉',
      });

      await expect(actualPromise).rejects.toThrow(EntityAlreadyExistsError);
      expect(mockTransaction.entities).toEqual({ abc: existingEntity });
      expect(mockTransaction.events).toBeEmpty();
    });

    it('should update the entity', async () => {
      const existingEntity = new MySimpleEntity({
        id: 'abc',
        // Same as creation, the `deletedAt` property should not be taken into account.
        deletedAt: new Date(),
      } as any);
      mockTransaction.set(existingEntity);
      const validationFn = jest.fn(() => Promise.resolve());

      const actualEvent = await manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
        { validationFn, checkUpdatedAt: existingEntity.updatedAt },
      );

      expect(actualEvent).toBeInstanceOf(MySimpleEvent);
      expect(actualEvent).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          producedAt: mockTransaction.timestamp,
          name: 'myEntityUpdated',
          data: {
            ...existingEntity,
            updatedAt: mockTransaction.timestamp,
            someProperty: '🔖',
          },
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MySimpleEntity);
      expect(mockTransaction.entities).toEqual({ abc: actualEvent.data });
      expectPublishedEvent(actualEvent);
      expect(validationFn).toHaveBeenCalledExactlyOnceWith(
        existingEntity,
        mockTransaction,
      );
    });

    it('should not support deletion', async () => {
      const actualPromise = manager.delete('myEntityDeleted', { id: 'abc' });

      await expect(actualPromise).rejects.toThrow(
        UnsupportedEntityOperationError,
      );
      expect(mockTransaction.entities).toBeEmptyObject();
      expect(mockTransaction.events).toBeEmpty();
    });
  });
});
