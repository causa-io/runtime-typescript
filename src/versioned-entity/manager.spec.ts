import { jest } from '@jest/globals';
import 'jest-extended';
import {
  EntityAlreadyExistsError,
  EntityNotFoundError,
  IncorrectEntityVersionError,
} from '../errors/index.js';
import { Event } from '../events/index.js';
import { TransactionOldTimestampError } from '../transaction/index.js';
import { VersionedEntityManager } from './manager.js';
import {
  MockRunner,
  MockTransaction,
  mockEventTransaction,
  mockStateTransaction,
  mockTransaction,
} from './utils.test.js';
import { VersionedEntity } from './versioned-entity.js';

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

describe('VersionedEntityManager', () => {
  let manager: VersionedEntityManager<MockTransaction, MyEvent>;

  beforeEach(() => {
    manager = new VersionedEntityManager<MockTransaction, MyEvent>(
      'my-topic',
      MyEvent,
      MyEntity,
      new MockRunner(),
    );
  });

  afterEach(() => {
    mockEventTransaction.bufferedEvents = [];
  });

  describe('create', () => {
    it('should fail if the entity already exists', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ id: 'abc' }),
      );

      const actualPromise = manager.create('myEntityCreated', {
        id: 'abc',
        someProperty: '🎉',
      });

      await expect(actualPromise).rejects.toThrow(EntityAlreadyExistsError);
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should fail if the entity is soft-deleted but the transaction timestamp is older', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({
          id: 'abc',
          updatedAt: new Date('2999-01-01'),
          deletedAt: new Date('2999-01-01'),
        }),
      );

      const actualPromise = manager.create('myEntityCreated', {
        id: 'abc',
        someProperty: '🎉',
      });

      await expect(actualPromise).rejects.toThrow(TransactionOldTimestampError);
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
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
          data: expect.objectContaining({
            id: 'abc',
            createdAt: mockTransaction.timestamp,
            updatedAt: mockTransaction.timestamp,
            deletedAt: null,
            someProperty: '🎉',
          }),
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockStateTransaction.replace).toHaveBeenCalledExactlyOnceWith(
        actualEvent.data,
      );
      expect(mockEventTransaction.bufferedEvents).toEqual([
        { topic: 'my-topic', event: actualEvent, options: { attributes: {} } },
      ]);
    });

    it('should create the entity if it is soft-deleted', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
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
          data: expect.objectContaining({
            id: 'abc',
            createdAt: mockTransaction.timestamp,
            updatedAt: mockTransaction.timestamp,
            deletedAt: null,
            someProperty: '🎉',
          }),
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockStateTransaction.replace).toHaveBeenCalledExactlyOnceWith(
        actualEvent.data,
      );
      expect(mockEventTransaction.bufferedEvents).toEqual([
        { topic: 'my-topic', event: actualEvent, options: { attributes: {} } },
      ]);
    });

    it('should accept options', async () => {
      jest.spyOn(manager.runner, 'run');

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

      expect(manager.runner.run).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([
        {
          topic: 'my-topic',
          event: actualEvent,
          options: { attributes: { att1: '🎁' } },
        },
      ]);
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
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should fail if the entity is soft-deleted', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ id: 'abc', deletedAt: new Date('2020-01-01') }),
      );

      const actualPromise = manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
      );

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should fail if the version timestamps do not match', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ id: 'abc', updatedAt: new Date('2020-01-01') }),
      );

      const actualPromise = manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
        { checkUpdatedAt: new Date('2020-01-02') },
      );

      await expect(actualPromise).rejects.toThrow(IncorrectEntityVersionError);
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should fail if the state is more recent than the transaction timestamp', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ id: 'abc', updatedAt: new Date('2999-01-01') }),
      );

      const actualPromise = manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
      );

      await expect(actualPromise).rejects.toThrow(TransactionOldTimestampError);
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should update the entity', async () => {
      const existingEntity = new MyEntity({ id: 'abc' });
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        existingEntity,
      );
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
          data: expect.objectContaining({
            ...existingEntity,
            updatedAt: mockTransaction.timestamp,
            someProperty: '🔖',
          }),
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockStateTransaction.replace).toHaveBeenCalledExactlyOnceWith(
        actualEvent.data,
      );
      expect(mockEventTransaction.bufferedEvents).toEqual([
        { topic: 'my-topic', event: actualEvent, options: { attributes: {} } },
      ]);
      expect(validationFn).toHaveBeenCalledExactlyOnceWith(existingEntity);
    });

    it('should use a function as the update', async () => {
      const existingEntity = new MyEntity({ id: 'abc' });
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        existingEntity,
      );

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
          data: expect.objectContaining({
            ...existingEntity,
            updatedAt: mockTransaction.timestamp,
            someProperty: `abc ${mockTransaction.timestamp.toISOString()}`,
          }),
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockStateTransaction.replace).toHaveBeenCalledExactlyOnceWith(
        actualEvent.data,
      );
      expect(mockEventTransaction.bufferedEvents).toEqual([
        { topic: 'my-topic', event: actualEvent, options: { attributes: {} } },
      ]);
    });

    it('should rethrow an error from the validation function', async () => {
      const existingEntity = new MyEntity({ id: 'abc' });
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        existingEntity,
      );

      const actualPromise = manager.update(
        'myEntityUpdated',
        { id: 'abc' },
        { someProperty: '🔖' },
        { validationFn: () => Promise.reject(new Error('🔥')) },
      );

      await expect(actualPromise).rejects.toThrow('🔥');
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should prioritize the validation function over the checkUpdatedAt option', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ id: 'abc', updatedAt: new Date('2020-01-01') }),
      );

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
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should accept options', async () => {
      jest.spyOn(manager.runner, 'run');
      const existingEntity = new MyEntity({ id: 'abc' });

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

      expect(manager.runner.run).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([
        {
          topic: 'my-topic',
          event: actualEvent,
          options: { attributes: { att1: '🎁' } },
        },
      ]);
      expect(mockStateTransaction.findOneWithSameKeyAs).not.toHaveBeenCalled();
    });

    it('should use the provided custom update logic', async () => {
      class MyManager extends VersionedEntityManager<MockTransaction, MyEvent> {
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
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        existingEntity,
      );

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
          data: expect.objectContaining({
            ...existingEntity,
            updatedAt: mockTransaction.timestamp,
            someProperty: '👋 📝',
          }),
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockStateTransaction.replace).toHaveBeenCalledExactlyOnceWith(
        actualEvent.data,
      );
      expect(mockEventTransaction.bufferedEvents).toEqual([
        { topic: 'my-topic', event: actualEvent, options: { attributes: {} } },
      ]);
    });
  });

  describe('delete', () => {
    it('should fail if the entity does not exists', async () => {
      const actualPromise = manager.delete('myEntityDeleted', { id: 'abc' });

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should fail if the entity is soft-deleted', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ id: 'abc', deletedAt: new Date('2020-01-01') }),
      );

      const actualPromise = manager.delete('myEntityDeleted', { id: 'abc' });

      await expect(actualPromise).rejects.toThrow(EntityNotFoundError);
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should fail if the version timestamps do not match', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ id: 'abc', updatedAt: new Date('2020-01-01') }),
      );

      const actualPromise = manager.delete(
        'myEntityDeleted',
        { id: 'abc' },
        { checkUpdatedAt: new Date('2020-01-02') },
      );

      await expect(actualPromise).rejects.toThrow(IncorrectEntityVersionError);
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should fail if the state is more recent than the transaction timestamp', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ id: 'abc', updatedAt: new Date('2999-01-01') }),
      );

      const actualPromise = manager.delete('myEntityDeleted', { id: 'abc' });

      await expect(actualPromise).rejects.toThrow(TransactionOldTimestampError);
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should delete the entity', async () => {
      const existingEntity = new MyEntity({ id: 'abc' });
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        existingEntity,
      );
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
          data: expect.objectContaining({
            ...existingEntity,
            updatedAt: mockTransaction.timestamp,
            deletedAt: mockTransaction.timestamp,
          }),
        }),
      );
      expect(actualEvent.data).toBeInstanceOf(MyEntity);
      expect(mockStateTransaction.replace).toHaveBeenCalledExactlyOnceWith(
        actualEvent.data,
      );
      expect(mockEventTransaction.bufferedEvents).toEqual([
        { topic: 'my-topic', event: actualEvent, options: { attributes: {} } },
      ]);
      expect(validationFn).toHaveBeenCalledExactlyOnceWith(existingEntity);
    });

    it('should rethrow an error from the validation function', async () => {
      const existingEntity = new MyEntity({ id: 'abc' });
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        existingEntity,
      );

      const actualPromise = manager.delete(
        'myEntityDeleted',
        { id: 'abc' },
        { validationFn: () => Promise.reject(new Error('🔥')) },
      );

      await expect(actualPromise).rejects.toThrow('🔥');
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([]);
    });

    it('should accept options', async () => {
      jest.spyOn(manager.runner, 'run');
      const existingEntity = new MyEntity({ id: 'abc' });

      const actualEvent = await manager.delete(
        'myEntityDeleted',
        { id: 'abc' },
        {
          transaction: mockTransaction,
          publishOptions: { attributes: { att1: '🎁' } },
          existingEntity,
        },
      );

      expect(manager.runner.run).not.toHaveBeenCalled();
      expect(mockEventTransaction.bufferedEvents).toEqual([
        {
          topic: 'my-topic',
          event: actualEvent,
          options: { attributes: { att1: '🎁' } },
        },
      ]);
      expect(mockStateTransaction.findOneWithSameKeyAs).not.toHaveBeenCalled();
    });
  });
});
