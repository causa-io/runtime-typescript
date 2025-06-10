import { Transaction } from './transaction.js';

/**
 * The abstract base class for transaction runners.
 * Transaction runners are responsible for creating and committing {@link Transaction}s, while the actual processing
 * occurring within the transaction is handled by the passed asynchronous function.
 */
export abstract class TransactionRunner<T extends Transaction> {
  /**
   * Runs the given function in a newly-created transaction.
   *
   * @param runFn The function to run in the transaction.
   * @returns The return value of the `runFn` function, as well as possible implementation-specific transaction results.
   */
  abstract run<RT>(
    runFn: (transaction: T) => Promise<RT>,
  ): Promise<[RT, ...any]>;

  /**
   * Runs the given function in the given transaction, or in a newly-created transaction if the given transaction is
   * `undefined`.
   *
   * @param transaction The {@link Transaction} to run the function in. If `undefined`, a new transaction will be
   *   created and committed.
   * @param runFn The function to run in the transaction.
   * @returns The return value of the `runFn` function.
   */
  async runInNewOrExisting<RT>(
    transaction: T | undefined,
    runFn: (transaction: T) => Promise<RT>,
  ): Promise<RT> {
    if (transaction) {
      return runFn(transaction);
    }

    const [returnValue] = await this.run(runFn);
    return returnValue;
  }
}
