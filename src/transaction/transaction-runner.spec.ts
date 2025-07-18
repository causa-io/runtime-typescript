import { jest } from '@jest/globals';
import 'jest-extended';
import {
  TransactionRunner,
  type ReadWriteTransactionOptions,
  type TransactionFn,
} from './transaction-runner.js';
import { Transaction } from './transaction.js';
import { MockTransaction } from './utils.test.js';

const createdRWTransaction = new MockTransaction();
const createdROTransaction = new MockTransaction();

class MyRunner extends TransactionRunner<Transaction, Transaction> {
  async runReadWrite<RT>(
    options: ReadWriteTransactionOptions,
    runFn: TransactionFn<Transaction, RT>,
  ): Promise<RT> {
    return await runFn(createdRWTransaction);
  }

  async runReadOnly<RT>(runFn: TransactionFn<Transaction, RT>): Promise<RT> {
    return await runFn(createdROTransaction);
  }
}

describe('TransactionRunner', () => {
  let runner: MyRunner;

  beforeEach(() => {
    runner = new MyRunner();
    jest.spyOn(runner, 'runReadWrite');
    jest.spyOn(runner, 'runReadOnly');
  });

  describe('run', () => {
    const fn = jest.fn(() => Promise.resolve('🎉'));

    it('should run the given function in a new transaction', async () => {
      const actualResult = await runner.run(fn);

      expect(actualResult).toBe('🎉');
      expect(fn).toHaveBeenCalledExactlyOnceWith(createdRWTransaction);
      expect(runner.runReadWrite).toHaveBeenCalledExactlyOnceWith({}, fn);
      expect(runner.runReadOnly).not.toHaveBeenCalled();
    });

    it('should run the given function in the existing transaction', async () => {
      const transaction = new MockTransaction();

      const actualResult = await runner.run({ transaction }, fn);

      expect(actualResult).toBe('🎉');
      expect(fn).toHaveBeenCalledExactlyOnceWith(transaction);
      expect(runner.runReadWrite).not.toHaveBeenCalled();
      expect(runner.runReadOnly).not.toHaveBeenCalled();
    });

    it('should run the given function in a new transaction with publish options', async () => {
      const expectedOptions: ReadWriteTransactionOptions = {
        publishOptions: { attributes: { tada: '🎉' } },
      };

      const actualResult = await runner.run(expectedOptions, fn);

      expect(actualResult).toBe('🎉');
      expect(fn).toHaveBeenCalledExactlyOnceWith(createdRWTransaction);
      expect(runner.runReadWrite).toHaveBeenCalledExactlyOnceWith(
        expectedOptions,
        fn,
      );
      expect(runner.runReadOnly).not.toHaveBeenCalled();
    });

    it('should run the given function in a read-only transaction', async () => {
      const actualResult = await runner.run({ readOnly: true }, fn);

      expect(actualResult).toBe('🎉');
      expect(fn).toHaveBeenCalledExactlyOnceWith(createdROTransaction);
      expect(runner.runReadWrite).not.toHaveBeenCalled();
      expect(runner.runReadOnly).toHaveBeenCalledExactlyOnceWith(fn);
    });
  });
});
