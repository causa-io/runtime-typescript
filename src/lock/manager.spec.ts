import { jest } from '@jest/globals';
import 'jest-extended';
import { randomUUID } from 'node:crypto';
import {
  MockRunner,
  type MockTransaction,
  mockTransaction,
} from '../transaction/utils.test.js';
import type { LockEntity } from './entity.js';
import { LockAcquisitionError, LockReleaseError } from './errors.js';
import { LockManager } from './manager.js';

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
  let runner: MockRunner;
  let manager: LockManager<MockTransaction, MyLock>;

  beforeAll(() => {
    runner = new MockRunner();
    manager = new LockManager(MyLock, runner, 1000);
  });

  afterEach(() => {
    mockTransaction.clear();
  });

  describe('acquire', () => {
    it('should fail to acquire the lock when it is not expired', async () => {
      const id = randomUUID();
      const existingLock = new MyLock({
        id,
        lock: randomUUID(),
        expiresAt: new Date('3000-01-01'),
        someCustomData: '📦',
      });
      await mockTransaction.set(existingLock);

      const actualPromise = manager.acquire(id);

      await expect(actualPromise).rejects.toThrow(LockAcquisitionError);
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toEqual(existingLock);
    });

    it('should acquire an existing but expired lock', async () => {
      const id = randomUUID();
      const existingLock = new MyLock({
        id,
        lock: randomUUID(),
        expiresAt: new Date('2000-01-01'),
        someCustomData: null,
      });
      await mockTransaction.set(existingLock);

      const returnedLock = await manager.acquire(id);

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 1000),
        someCustomData: null,
      });
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toEqual(returnedLock);
    });

    it('should acquire the lock', async () => {
      const id = randomUUID();

      const returnedLock = await manager.acquire(id);

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 1000),
        someCustomData: null,
      });
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toEqual(returnedLock);
    });

    it('should store the passed extra data', async () => {
      const id = randomUUID();

      const returnedLock = await manager.acquire(id, {
        extraData: { someCustomData: '💡' },
      });

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 1000),
        someCustomData: '💡',
      });
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toEqual(returnedLock);
    });

    it('should fail to acquire the lock if extra validation fails', async () => {
      const id = randomUUID();
      const existingLock = new MyLock({
        id,
        lock: randomUUID(),
        expiresAt: new Date('2021-01-01'),
        someCustomData: 'nope',
      });
      await mockTransaction.set(existingLock);

      const actualPromise = manager.acquire(id, {
        extraValidation: (lock) => {
          if (lock.someCustomData === 'nope') {
            throw new Error('💥');
          }
        },
      });

      await expect(actualPromise).rejects.toThrow('💥');
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toEqual(existingLock);
    });

    it('should set a custom expiration delay', async () => {
      const id = randomUUID();

      const returnedLock = await manager.acquire(id, {
        expirationDelay: 2000,
      });

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 2000),
        someCustomData: null,
      });
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toEqual(returnedLock);
    });

    it('should acquire an existing lock with null values', async () => {
      const id = randomUUID();
      const existingLock = new MyLock({
        id,
        lock: null,
        expiresAt: null,
        someCustomData: null,
      });
      await mockTransaction.set(existingLock);

      const returnedLock = await manager.acquire(id);

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 1000),
        someCustomData: null,
      });
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toEqual(returnedLock);
    });

    it('should run in a transaction', async () => {
      jest.spyOn(runner, 'runReadWrite');
      const id = randomUUID();

      await manager.acquire(id, { transaction: mockTransaction });

      expect(runner.runReadWrite).not.toHaveBeenCalled();
    });

    it('should reuse an existing expired lock when useExisting is true', async () => {
      const id = randomUUID();
      const existingLock = new MyLock({
        id,
        lock: randomUUID(),
        expiresAt: new Date('2000-01-01'),
        someCustomData: '📦',
      });
      await mockTransaction.set(existingLock);

      const returnedLock = await manager.acquire(id, {
        useExisting: true,
        extraData: { someCustomData: '🙈' },
      });

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 1000),
        someCustomData: '📦',
      });
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toEqual(returnedLock);
    });

    it('should create a new lock when useExisting is true but no lock exists', async () => {
      const id = randomUUID();

      const returnedLock = await manager.acquire(id, {
        useExisting: true,
        extraData: { someCustomData: '💡' },
      });

      expect(returnedLock).toEqual({
        id,
        lock: expect.any(String),
        expiresAt: new Date(mockTransaction.timestamp.getTime() + 1000),
        someCustomData: '💡',
      });
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toEqual(returnedLock);
    });

    it('should fail to acquire when useExisting is true and lock is not expired', async () => {
      const id = randomUUID();
      const existingLock = new MyLock({
        id,
        lock: randomUUID(),
        expiresAt: new Date('3000-01-01'),
        someCustomData: '📦',
      });
      await mockTransaction.set(existingLock);

      const actualPromise = manager.acquire(id, { useExisting: true });

      await expect(actualPromise).rejects.toThrow(LockAcquisitionError);
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toEqual(existingLock);
    });
  });

  describe('checkNotAcquiredOrFail', () => {
    it('should throw when the lock is not expired', async () => {
      const id = randomUUID();
      const existingLock = new MyLock({
        id,
        lock: randomUUID(),
        expiresAt: new Date('3000-01-01'),
        someCustomData: '📦',
      });
      await mockTransaction.set(existingLock);

      const actualPromise = manager.checkNotAcquiredOrFail(id, mockTransaction);

      await expect(actualPromise).rejects.toThrow(LockAcquisitionError);
    });

    it('should not throw for an existing but expired lock', async () => {
      const id = randomUUID();
      const existingLock = new MyLock({
        id,
        lock: randomUUID(),
        expiresAt: new Date('2000-01-01'),
        someCustomData: null,
      });
      await mockTransaction.set(existingLock);

      const actualPromise = manager.checkNotAcquiredOrFail(id, mockTransaction);

      await expect(actualPromise).resolves.toBeUndefined();
    });

    it('should not throw when the lock does not exist', async () => {
      const id = randomUUID();

      const actualPromise = manager.checkNotAcquiredOrFail(id, mockTransaction);

      await expect(actualPromise).resolves.toBeUndefined();
    });

    it('should fail if extra validation fails', async () => {
      const id = randomUUID();
      const existingLock = new MyLock({
        id,
        lock: randomUUID(),
        expiresAt: new Date('2021-01-01'),
        someCustomData: 'nope',
      });
      await mockTransaction.set(existingLock);

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
      const id = randomUUID();

      const releaseLockPromise = manager.release({ id, lock: randomUUID() });

      await expect(releaseLockPromise).rejects.toThrow(LockReleaseError);
      await expect(releaseLockPromise).rejects.toThrow(
        'The lock could not be found.',
      );
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toBeNull();
    });

    it('should fail to release a lock that does not match', async () => {
      const id = randomUUID();
      const lock = randomUUID();
      const existingLock = new MyLock({
        id,
        lock,
        expiresAt: new Date('3000-01-01'),
        someCustomData: '🔒',
      });
      await mockTransaction.set(existingLock);

      const releaseLockPromise = manager.release(
        { id, lock: randomUUID() },
        { delete: false },
      );

      await expect(releaseLockPromise).rejects.toThrow(LockReleaseError);
      await expect(releaseLockPromise).rejects.toThrow(
        'The lock does not match.',
      );
      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toEqual(existingLock);
    });

    it('should delete the lock', async () => {
      const id = randomUUID();
      const lock = randomUUID();
      const existingLock = new MyLock({
        id,
        lock,
        expiresAt: new Date('3000-01-01'),
      });
      await mockTransaction.set(existingLock);

      await manager.release(existingLock);

      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toBeNull();
    });

    it('should set the lock to null instead of deleting it', async () => {
      const id = randomUUID();
      const lock = randomUUID();
      const existingLock = new MyLock({
        id,
        lock,
        expiresAt: new Date('3000-01-01'),
        someCustomData: '📗',
      });
      await mockTransaction.set(existingLock);

      await manager.release({ id, lock }, { delete: false });

      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toMatchObject({
        id,
        lock: null,
        expiresAt: null,
      });
    });

    it('should set the lock to null and write extra data', async () => {
      const id = randomUUID();
      const lock = randomUUID();
      const existingLock = new MyLock({
        id,
        lock,
        expiresAt: new Date('3000-01-01'),
        someCustomData: '📗',
      });
      await mockTransaction.set(existingLock);

      await manager.release(
        { id, lock },
        { delete: false, extraData: { someCustomData: '📙' } },
      );

      const actualLock = await mockTransaction.get(MyLock, { id });
      expect(actualLock).toMatchObject({
        ...existingLock,
        lock: null,
        expiresAt: null,
        someCustomData: '📙',
      });
    });

    it('should run in a transaction', async () => {
      jest.spyOn(runner, 'runReadWrite');
      const id = randomUUID();
      const lock = randomUUID();
      const existingLock = new MyLock({
        id,
        lock,
        expiresAt: new Date('3000-01-01'),
        someCustomData: null,
      });
      await mockTransaction.set(existingLock);

      await manager.release({ id, lock }, { transaction: mockTransaction });

      expect(runner.runReadWrite).not.toHaveBeenCalled();
    });
  });
});
