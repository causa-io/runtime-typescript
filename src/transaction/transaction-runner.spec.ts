import { jest } from '@jest/globals';
import 'jest-extended';
import { TransactionRunner } from './transaction-runner.js';
import { Transaction } from './transaction.js';

type MyTransaction = Transaction<any, any>;

const createdTransaction = new Transaction<any, any>({}, {});

class MyRunner extends TransactionRunner<MyTransaction> {
  async run<RT>(
    runFn: (transaction: MyTransaction) => Promise<RT>,
  ): Promise<[RT, ...any[]]> {
    return [await runFn(createdTransaction), { someResult: '📈' }];
  }
}

describe('TransactionRunner', () => {
  let runner: MyRunner;

  beforeEach(() => {
    runner = new MyRunner();
    jest.spyOn(runner, 'run');
  });

  describe('runInNewOrExisting', () => {
    it('should run the given function in the existing transaction', async () => {
      const transaction = new Transaction({}, {} as any);
      const fn = jest.fn(() => Promise.resolve('🎉'));

      const actualResult = await runner.runInNewOrExisting(transaction, fn);

      expect(actualResult).toBe('🎉');
      expect(fn).toHaveBeenCalledExactlyOnceWith(transaction);
      expect(runner.run).not.toHaveBeenCalled();
    });

    it('should run the given function in a new transaction', async () => {
      const fn = jest.fn(() => Promise.resolve('🎉'));

      const actualResult = await runner.runInNewOrExisting(undefined, fn);

      expect(actualResult).toBe('🎉');
      expect(fn).toHaveBeenCalledExactlyOnceWith(createdTransaction);
      expect(runner.run).toHaveBeenCalledExactlyOnceWith(fn);
    });
  });
});
