import { jest } from '@jest/globals';
import type { Event, PublishOptions } from '../events/index.js';
import {
  BufferEventTransaction,
  type EventTransaction,
  type FindReplaceStateTransaction,
  Transaction,
  TransactionRunner,
} from '../transaction/index.js';

export type MockTransaction = Transaction<FindReplaceStateTransaction, any>;

export const mockStateTransaction = {
  findOneWithSameKeyAs: jest.fn(() => Promise.resolve(undefined)) as jest.Mock<
    FindReplaceStateTransaction['findOneWithSameKeyAs']
  >,
  replace: jest.fn(() => Promise.resolve()) as jest.Mock<
    FindReplaceStateTransaction['replace']
  >,
};

export const mockEventTransaction: EventTransaction & {
  bufferedEvents: { topic: string; event: Event; options: PublishOptions }[];
} = new BufferEventTransaction({} as any) as any;

export const mockTransaction = new Transaction<any, any>(
  mockStateTransaction,
  mockEventTransaction,
);

export class MockRunner extends TransactionRunner<MockTransaction> {
  async run<RT>(
    runFn: (transaction: MockTransaction) => Promise<RT>,
  ): Promise<[RT]> {
    return [await runFn(mockTransaction)];
  }
}
