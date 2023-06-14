import { Event, PublishOptions } from '../events/index.js';
import { TransactionOldTimestampError } from './errors.js';
import { EventTransaction } from './event-transaction.js';

/**
 * A transaction object in which both state changes and events can be staged, and committed all at once.
 * The {@link Transaction.stateTransaction} is used to stage state changes, and the {@link Transaction.eventTransaction}
 * is used to stage events.
 * The {@link Transaction.timestamp} provides the single point in time at which changes will be considered to have
 * happened.
 */
export class Transaction<ST, ET extends EventTransaction> {
  /**
   * The timestamp for the transaction, used as the single point in time at which the state changes and events will be
   * considered to have occurred.
   */
  readonly timestamp = new Date();

  /**
   * Creates a new {@link Transaction}.
   *
   * @param stateTransaction The transaction to use for state changes.
   * @param eventTransaction The transaction to use to publish events.
   */
  constructor(readonly stateTransaction: ST, readonly eventTransaction: ET) {}

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

  /**
   * Forwards the given event to the {@link Transaction.eventTransaction}.
   *
   * @param topic The topic to which the event should be published.
   * @param event The event to publish.
   * @param options Options for publishing the event.
   */
  async publish(
    topic: string,
    event: Event,
    options: PublishOptions = {},
  ): Promise<void> {
    await this.eventTransaction.publish(topic, event, options);
  }
}
