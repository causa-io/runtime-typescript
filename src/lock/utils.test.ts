import type { Event, PublishOptions } from '../events/index.js';
import {
  BufferEventTransaction,
  type EventTransaction,
  type FindReplaceStateTransaction,
  Transaction,
  TransactionRunner,
} from '../transaction/index.js';

class MockFindReplaceStateTransaction implements FindReplaceStateTransaction {
  private entities: Record<string, any> = {};

  clear() {
    this.entities = {};
  }

  async replace<T extends object>(entity: T): Promise<void> {
    this.entities[(entity as any).id] = entity;
  }

  async deleteWithSameKeyAs<T extends object>(
    _: new () => T,
    entity: Partial<T>,
  ): Promise<void> {
    delete this.entities[(entity as any).id];
  }

  async findOneWithSameKeyAs<T extends object>(
    _: new () => T,
    entity: Partial<T>,
  ): Promise<T | undefined> {
    return this.entities[(entity as any).id];
  }
}

export type MockTransaction = Transaction<MockFindReplaceStateTransaction, any>;

export const mockStateTransaction = new MockFindReplaceStateTransaction();

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
