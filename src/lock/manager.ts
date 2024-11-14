import type { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import * as uuid from 'uuid';
import {
  type FindReplaceTransaction,
  Transaction,
  TransactionRunner,
} from '../transaction/index.js';
import type { LockEntity } from './entity.js';
import { LockAcquisitionError, LockReleaseError } from './errors.js';

/**
 * Base options for lock operations.
 */
type LockOptions<T extends Transaction<any, any>, E extends LockEntity> = {
  /**
   * Additional data that should be added to the lock.
   */
  extraData?: Partial<Omit<E, 'id' | 'lock' | 'expiresAt'>>;

  /**
   * The transaction to use when updating the lock.
   */
  transaction?: T;
};

/**
 * Options for the {@link acquireLock} function.
 */
type AcquireLockOptions<
  T extends FindReplaceTransaction,
  E extends LockEntity,
> = LockOptions<T, E> & {
  /**
   * A validation function that may cause the acquisition to fail, even if the generic lock could be acquired.
   */
  extraValidation?: (lock: E) => void;

  /**
   * The duration during which the lock should be acquired, in milliseconds.
   * Defaults to {@link LockManager.expirationDelay}.
   */
  expirationDelay?: number;
};

/**
 * Options for the {@link releaseLock} function.
 */
type ReleaseLockOptions<
  T extends FindReplaceTransaction,
  E extends LockEntity,
> = LockOptions<T, E> & {
  /**
   * Whether the lock should be deleted in order to release it. If `false`, the `lock` and `expiresAt` columns will be
   * set to `null` instead.
   * Defaults to `true`.
   */
  delete?: boolean;
};

/**
 * Manages the acquisition and release of locks, represented as entities in the state.
 */
export class LockManager<
  T extends FindReplaceTransaction,
  E extends LockEntity,
> {
  /**
   * Creates a new {@link LockManager}.
   *
   * @param lockType The type of the lock entity.
   * @param runner The transaction runner to use.
   * @param expirationDelay The default duration for which the lock should be acquired, in milliseconds.
   */
  constructor(
    readonly lockType: Type<E>,
    readonly runner: TransactionRunner<T>,
    readonly expirationDelay: number,
  ) {}

  /**
   * Validates that an existing lock is no longer acquired.
   *
   * @param lock The lock to validate.
   * @param currentTimestamp The current date and time, against which expiration dates can be compared.
   * @param options Options when validating the lock.
   */
  protected validateNotAcquired(
    lock: E,
    currentTimestamp: Date,
    options: Pick<AcquireLockOptions<T, E>, 'extraValidation'> = {},
  ): void {
    if (
      lock.lock !== null &&
      lock.expiresAt != null &&
      lock.expiresAt > currentTimestamp
    ) {
      throw new LockAcquisitionError(lock.expiresAt);
    }

    if (options.extraValidation) {
      options.extraValidation(lock);
    }
  }

  /**
   * Tries to acquire the lock for a given ID.
   *
   * @param id The ID of the resource for which the lock should be acquired.
   * @param options The options when acquiring the lock.
   * @returns The lock entity, containing the value that should be passed when releasing it.
   */
  async acquire(
    id: E['id'],
    options: AcquireLockOptions<T, E> = {},
  ): Promise<E> {
    const expirationDelay = options.expirationDelay ?? this.expirationDelay;

    return await this.runner.runInNewOrExisting(
      options.transaction,
      async (transaction) => {
        await this.checkNotAcquiredOrFail(id, transaction, {
          extraValidation: options.extraValidation,
        });

        const lock = plainToInstance(this.lockType, {
          ...options.extraData,
          id,
          lock: uuid.v4(),
          expiresAt: new Date(
            transaction.timestamp.getTime() + expirationDelay,
          ),
        });

        await transaction.stateTransaction.replace(lock);

        return lock;
      },
    );
  }

  /**
   * Checks that the lock for the given resource is not currently acquired.
   * This can be used within a transaction when the protected resource has to be modified, but acquiring the lock for
   * longer than the span of the transaction is not needed (i.e. there won't be a second transaction to release the
   * lock).
   *
   * @param id The ID of the resource for which the lock should be checked.
   * @param transaction The transaction to use.
   * @param options The options when checking the lock.
   */
  async checkNotAcquiredOrFail(
    id: E['id'],
    transaction: T,
    options: Pick<AcquireLockOptions<T, E>, 'extraValidation'> = {},
  ): Promise<void> {
    const existingLock =
      await transaction.stateTransaction.findOneWithSameKeyAs(this.lockType, {
        id,
      } as Partial<E>);
    if (!existingLock) {
      return;
    }

    this.validateNotAcquired(existingLock, transaction.timestamp, {
      extraValidation: options.extraValidation,
    });
  }

  /**
   * Releases a previously acquired lock for the given resource ID.
   *
   * @param lock The current, expected, value of the lock.
   * @param options Options when releasing the lock.
   */
  async release(
    lock: Pick<E, 'id' | 'lock'> & Partial<E>,
    options: ReleaseLockOptions<T, E> = {},
  ): Promise<void> {
    await this.runner.runInNewOrExisting(
      options.transaction,
      async (transaction) => {
        const existingLock =
          await transaction.stateTransaction.findOneWithSameKeyAs(
            this.lockType,
            lock,
          );
        if (!existingLock) {
          throw new LockReleaseError('The lock could not be found.');
        }

        if (existingLock.lock !== lock.lock) {
          throw new LockReleaseError('The lock does not match.');
        }

        if (options.delete ?? true) {
          await transaction.stateTransaction.deleteWithSameKeyAs(
            this.lockType,
            lock,
          );
        } else {
          const releasedLock = plainToInstance(this.lockType, {
            ...options.extraData,
            id: lock.id,
            lock: null,
            expiresAt: null,
          });

          await transaction.stateTransaction.replace(releasedLock);
        }
      },
    );
  }
}
