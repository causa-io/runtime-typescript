import type { TransactionPublishOptions } from './event-transaction.js';
import type { ReadOnlyStateTransaction } from './state-transaction.js';
import { Transaction } from './transaction.js';

/**
 * Option for a function that accepts a {@link Transaction}.
 */
export type TransactionOption<T extends Transaction> = {
  /**
   * An existing transaction to run the function in.
   * If provided, the function will be run in this transaction instead of creating a new one.
   */
  transaction?: T;
};

/**
 * Options for a function that accepts a {@link ReadOnlyStateTransaction}.
 */
export type ReadOnlyTransactionOption<ROT extends ReadOnlyStateTransaction> = {
  /**
   * An existing transaction to run the function in.
   * If provided, the function will be run in this transaction instead of creating a new one.
   */
  transaction?: ROT;
};

/**
 * Options when creating a new read-write transaction.
 */
export type ReadWriteTransactionOptions = {
  /**
   * Publish options applying to all events published within the transaction.
   */
  publishOptions?: TransactionPublishOptions;
};

/**
 * Options for the {@link TransactionRunner.run} method.
 * This is only defined for internal use, as the `run` method is overloaded to accept different types of options.
 */
type RunOptions<
  RWT extends Transaction,
  ROT extends ReadOnlyStateTransaction,
> =
  | TransactionOption<RWT>
  | ReadWriteTransactionOptions
  | (ReadOnlyTransactionOption<ROT> & { readOnly: true });

/**
 * A function to run within a transaction.
 */
export type TransactionFn<
  T extends Transaction | ReadOnlyStateTransaction,
  RT,
> = (transaction: T) => Promise<RT>;

/**
 * The abstract base class for transaction runners.
 * Transaction runners are responsible for creating and committing {@link Transaction}s, while the actual processing
 * occurring within the transaction is handled by the passed asynchronous function.
 */
export abstract class TransactionRunner<
  RWT extends Transaction,
  ROT extends ReadOnlyStateTransaction,
> {
  /**
   * Runs the given function in a newly-created read-write transaction.
   * This method should be implemented by subclasses to create the transaction and run the function within it.
   *
   * @param options Options for the transaction.
   * @param runFn The function to run in the transaction.
   * @returns The return value of the `runFn` function.
   */
  protected abstract runReadWrite<RT>(
    options: ReadWriteTransactionOptions,
    runFn: TransactionFn<RWT, RT>,
  ): Promise<RT>;

  /**
   * Runs the given function in a newly-created read-only transaction.
   * This method should be implemented by subclasses to create the transaction and run the function within it.
   *
   * @param runFn The function to run in the read-only transaction.
   * @returns The return value of the `runFn` function.
   */
  protected abstract runReadOnly<RT>(
    runFn: TransactionFn<ROT, RT>,
  ): Promise<RT>;

  /**
   * Runs the given function in a newly-created transaction.
   *
   * @param runFn The function to run in the transaction.
   * @returns The return value of the `runFn` function.
   */
  run<RT>(runFn: TransactionFn<RWT, RT>): Promise<RT>;

  /**
   * Runs the given function in a new or existing transaction, depending on the provided options.
   *
   * @param options Options for running the transaction, which may include an existing transaction or publish options.
   * @param runFn The function to run in the transaction.
   * @returns The return value of the `runFn` function.
   */
  run<RT>(
    options: TransactionOption<RWT> | ReadWriteTransactionOptions,
    runFn: TransactionFn<RWT, RT>,
  ): Promise<RT>;

  /**
   * Runs the given function in a read-only transaction.
   *
   * @param options Options for running a read-only transaction, which may include an existing transaction.
   * @param runFn The function to run in the read-only transaction.
   * @returns The return value of the `runFn` function.
   */
  run<RT>(
    options: ReadOnlyTransactionOption<ROT> & {
      /**
       * Whether the transaction to run is read-only.
       */
      readOnly: true;
    },
    runFn: TransactionFn<ROT, RT>,
  ): Promise<RT>;

  async run<RT>(
    optionsOrRunFn: RunOptions<RWT, ROT> | TransactionFn<RWT, RT>,
    runFn?: TransactionFn<RWT, RT> | TransactionFn<ROT, RT>,
  ): Promise<RT> {
    const options: RunOptions<RWT, ROT> = runFn
      ? (optionsOrRunFn as RunOptions<RWT, ROT>)
      : {};
    runFn ??= optionsOrRunFn as TransactionFn<RWT, RT> | TransactionFn<ROT, RT>;

    if ('transaction' in options && options.transaction) {
      return await runFn(options.transaction as any);
    }

    if ('readOnly' in options) {
      return await this.runReadOnly(runFn as TransactionFn<ROT, RT>);
    }

    return await this.runReadWrite(
      options as ReadWriteTransactionOptions,
      runFn as TransactionFn<RWT, RT>,
    );
  }
}
