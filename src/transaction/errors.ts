import { RetryableError } from '../errors/index.js';

/**
 * An error thrown when the timestamp used within a transaction is in the past compared to existing entities in the
 * state.
 * This usually indicates that clocks are not synchronized, and may be more or less serious depending on the observed
 * {@link TransactionOldTimestampError.delay}.
 */
export class TransactionOldTimestampError extends RetryableError {
  /**
   * Creates a new {@link TransactionOldTimestampError}.
   *
   * @param transactionTimestamp The timestamp set in the failed transaction.
   * @param delay The observed delay by which the transaction was set in the past.
   */
  constructor(readonly transactionTimestamp: Date, delay: number) {
    super(
      'Failed to validate an existing date against the transaction timestamp.',
      delay,
    );
  }
}
