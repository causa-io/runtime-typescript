import { jest } from '@jest/globals';
import { Event, PublishOptions } from '../events/index.js';
import {
  BufferEventTransaction,
  EventTransaction,
  Transaction,
  TransactionRunner,
} from '../transaction/index.js';
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
