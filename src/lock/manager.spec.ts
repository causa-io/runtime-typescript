import { jest } from '@jest/globals';
import 'jest-extended';
import * as uuid from 'uuid';
import { LockEntity } from './entity.js';
import { LockAcquisitionError, LockReleaseError } from './errors.js';
import { LockManager } from './manager.js';
import {
  MockRunner,
  MockTransaction,
  mockStateTransaction,
  mockTransaction,
} from './utils.test.js';

class MyLock implements LockEntity {
  public constructor(init?: Partial<MyLock>) {
    Object.assign(this, init);
  }

  readonly id!: string;
  readonly lock!: string | null;
  readonly expiresAt!: Date | null;
  readonly someCustomData: string | null = null;
}

describe('LockManager', () => {
  let manager: LockManager<MockTransaction, MyLock>;

  beforeAll(() => {
    manager = new LockManager(MyLock, new MockRunner(), 1000);
  });

  afterEach(() => {
    mockStateTransaction.clear();
  });

  describe('acquire', () => {
    it('should fail to acquire the lock when it is not expired', async () => {
      const id = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock: uuid.v4(),
        expiresAt: new Date('3000-01-01'),
        someCustomData: '📦',
      });
      await mockStateTransaction.replace(existingLock);

      const actualPromise = manager.acquire(id);

      await expect(actualPromise).rejects.toThrow(LockAcquisitionError);
      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toEqual(existingLock);
    });

    it('should acquire an existing but expired lock', async () => {
      const id = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock: uuid.v4(),
        expiresAt: new Date('2000-01-01'),
        someCustomData: null,
      });
      await mockStateTransaction.replace(existingLock);

      const returnedLock = await manager.acquire(id);

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 1000),
        someCustomData: null,
      });
      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toEqual(returnedLock);
    });

    it('should acquire the lock', async () => {
      const id = uuid.v4();

      const returnedLock = await manager.acquire(id);

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 1000),
        someCustomData: null,
      });
      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toEqual(returnedLock);
    });

    it('should store the passed extra data', async () => {
      const id = uuid.v4();

      const returnedLock = await manager.acquire(id, {
        extraData: { someCustomData: '💡' },
      });

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 1000),
        someCustomData: '💡',
      });
      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toEqual(returnedLock);
    });

    it('should fail to acquire the lock if extra validation fails', async () => {
      const id = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock: uuid.v4(),
        expiresAt: new Date('2021-01-01'),
        someCustomData: 'nope',
      });
      await mockStateTransaction.replace(existingLock);

      const actualPromise = manager.acquire(id, {
        extraValidation: (lock) => {
          if (lock.someCustomData === 'nope') {
            throw new Error('💥');
          }
        },
      });

      await expect(actualPromise).rejects.toThrow('💥');
      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toEqual(existingLock);
    });

    it('should set a custom expiration delay', async () => {
      const id = uuid.v4();

      const returnedLock = await manager.acquire(id, {
        expirationDelay: 2000,
      });

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 2000),
        someCustomData: null,
      });
      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toEqual(returnedLock);
    });

    it('should acquire an existing lock with null values', async () => {
      const id = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock: null,
        expiresAt: null,
        someCustomData: null,
      });
      await mockStateTransaction.replace(existingLock);

      const returnedLock = await manager.acquire(id);

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 1000),
        someCustomData: null,
      });
      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toEqual(returnedLock);
    });

    it('should run in a transaction', async () => {
      jest.spyOn(manager.runner, 'run');
      const id = uuid.v4();

      await manager.acquire(id, { transaction: mockTransaction });

      expect(manager.runner.run).not.toHaveBeenCalled();
    });
  });

  describe('checkNotAcquiredOrFail', () => {
    it('should throw when the lock is not expired', async () => {
      const id = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock: uuid.v4(),
        expiresAt: new Date('3000-01-01'),
        someCustomData: '📦',
      });
      await mockStateTransaction.replace(existingLock);

      const actualPromise = manager.checkNotAcquiredOrFail(id, mockTransaction);

      await expect(actualPromise).rejects.toThrow(LockAcquisitionError);
    });

    it('should not throw for an existing but expired lock', async () => {
      const id = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock: uuid.v4(),
        expiresAt: new Date('2000-01-01'),
        someCustomData: null,
      });
      await mockStateTransaction.replace(existingLock);

      const actualPromise = manager.checkNotAcquiredOrFail(id, mockTransaction);

      await expect(actualPromise).resolves.toBeUndefined();
    });

    it('should not throw when the lock does not exist', async () => {
      const id = uuid.v4();

      const actualPromise = manager.checkNotAcquiredOrFail(id, mockTransaction);

      await expect(actualPromise).resolves.toBeUndefined();
    });

    it('should fail if extra validation fails', async () => {
      const id = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock: uuid.v4(),
        expiresAt: new Date('2021-01-01'),
        someCustomData: 'nope',
      });
      await mockStateTransaction.replace(existingLock);

      const actualPromise = manager.checkNotAcquiredOrFail(
        id,
        mockTransaction,
        {
          extraValidation: (lock) => {
            if (lock.someCustomData === 'nope') {
              throw new Error('💥');
            }
          },
        },
      );

      await expect(actualPromise).rejects.toThrow('💥');
    });
  });

  describe('release', () => {
    it('should fail to release a lock that does not exist', async () => {
      const id = uuid.v4();

      const releaseLockPromise = manager.release({ id, lock: uuid.v4() });

      await expect(releaseLockPromise).rejects.toThrow(LockReleaseError);
      await expect(releaseLockPromise).rejects.toThrow(
        'The lock could not be found.',
      );
      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toBeUndefined();
    });

    it('should fail to release a lock that does not match', async () => {
      const id = uuid.v4();
      const lock = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock,
        expiresAt: new Date('3000-01-01'),
        someCustomData: '🔒',
      });
      await mockStateTransaction.replace(existingLock);

      const releaseLockPromise = manager.release(
        { id, lock: uuid.v4() },
        { delete: false },
      );

      await expect(releaseLockPromise).rejects.toThrow(LockReleaseError);
      await expect(releaseLockPromise).rejects.toThrow(
        'The lock does not match.',
      );
      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toEqual(existingLock);
    });

    it('should delete the lock', async () => {
      const id = uuid.v4();
      const lock = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock,
        expiresAt: new Date('3000-01-01'),
      });
      await mockStateTransaction.replace(existingLock);

      await manager.release(existingLock);

      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toBeUndefined();
    });

    it('should set the lock to null instead of deleting it', async () => {
      const id = uuid.v4();
      const lock = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock,
        expiresAt: new Date('3000-01-01'),
        someCustomData: '📗',
      });
      await mockStateTransaction.replace(existingLock);

      await manager.release({ id, lock }, { delete: false });

      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toMatchObject({
        id,
        lock: null,
        expiresAt: null,
      });
    });

    it('should set the lock to null and write extra data', async () => {
      const id = uuid.v4();
      const lock = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock,
        expiresAt: new Date('3000-01-01'),
        someCustomData: '📗',
      });
      await mockStateTransaction.replace(existingLock);

      await manager.release(
        { id, lock },
        { delete: false, extraData: { someCustomData: '📙' } },
      );

      const actualLock = await mockStateTransaction.findOneWithSameKeyAs(
        MyLock,
        { id },
      );
      expect(actualLock).toMatchObject({
        ...existingLock,
        lock: null,
        expiresAt: null,
        someCustomData: '📙',
      });
    });

    it('should run in a transaction', async () => {
      jest.spyOn(manager.runner, 'run');
      const id = uuid.v4();
      const lock = uuid.v4();
      const existingLock = new MyLock({
        id,
        lock,
        expiresAt: new Date('3000-01-01'),
        someCustomData: null,
      });
      await mockStateTransaction.replace(existingLock);

      await manager.release({ id, lock }, { transaction: mockTransaction });

      expect(manager.runner.run).not.toHaveBeenCalled();
    });
  });
});
