import type { Type } from '@nestjs/common';
import type { PublishOptions } from '../events/index.js';
import { TransactionOldTimestampError } from './errors.js';
import type {
  EventTransaction,
  TransactionPublishOptions,
} from './event-transaction.js';
import type { StateTransaction } from './state-transaction.js';

/**
 * A transaction object in which both state changes and events can be staged, and committed all at once.
 * The {@link Transaction.timestamp} provides the single point in time at which changes will be considered to have
 * happened.
 */
export abstract class Transaction
  implements StateTransaction, EventTransaction
{
  /**
   * Creates a new {@link Transaction}.
   *
   * @param publishOptions The {@link TransactionPublishOptions} to use when publishing events as part of the
   *   transaction.
   */
  constructor(readonly publishOptions: TransactionPublishOptions) {}

  /**
   * The timestamp for the transaction, used as the single point in time at which the state changes and events will be
   * considered to have occurred.
   */
  readonly timestamp = new Date();

  /**
   * Validates that the given date is in the past compared to the current {@link TransactionContext.timestamp}.
   * This is useful to validate before performing a write on an existing entity, making sure the order of update dates
   * is consistent.
   *
   * @param date The date to validate.
   */
  validatePastDateOrFail(date?: Date) {
    if (!date) {
      return;
    }

    const delay = date.getTime() - this.timestamp.getTime();

    // If the transaction timestamp is more recent, this is the nominal expected case.
    if (delay < 0) {
      return;
    }

    throw new TransactionOldTimestampError(this.timestamp, delay);
  }

  abstract set<T extends object>(entity: T): Promise<void>;

  abstract delete<T extends object>(
    type: Type<T> | T,
    key?: Partial<T>,
  ): Promise<void>;

  abstract get<T extends object>(
    type: Type<T>,
    entity: Partial<T>,
  ): Promise<T | undefined>;

  abstract publish(
    topic: string,
    event: object,
    options?: PublishOptions,
  ): Promise<void>;
}
