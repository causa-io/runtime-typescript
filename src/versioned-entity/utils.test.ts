import { jest } from '@jest/globals';
import { Transaction, TransactionRunner } from '../transaction/index.js';
import { VersionedEntityStateTransaction } from './state-transaction.js';

export type MockTransaction = Transaction<VersionedEntityStateTransaction, any>;

export const mockStateTransaction = {
  findOneWithSameKeyAs: jest.fn(() => Promise.resolve(undefined)) as jest.Mock<
    VersionedEntityStateTransaction['findOneWithSameKeyAs']
  >,
  replace: jest.fn(() => Promise.resolve()) as jest.Mock<
    VersionedEntityStateTransaction['replace']
  >,
};

export const mockTransaction = new Transaction<any, any>(
  mockStateTransaction,
  {},
);

export class MockRunner extends TransactionRunner<MockTransaction> {
  async run<RT>(
    runFn: (transaction: MockTransaction) => Promise<RT>,
  ): Promise<[RT]> {
    return [await runFn(mockTransaction)];
  }
}
