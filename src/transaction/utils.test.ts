import { jest } from '@jest/globals';
import type { Type } from '@nestjs/common';
import type {
  EventPublisher,
  PreparedEvent,
  PublishOptions,
} from '../events/index.js';
import {
  OutboxEventTransaction,
  type OutboxTransaction,
  type StateTransaction,
  Transaction,
  TransactionRunner,
} from './index.js';
import type {
  ReadWriteTransactionOptions,
  TransactionFn,
} from './transaction-runner.js';

export class MockPublisher implements EventPublisher {
  async flush(): Promise<void> {}

  async prepare(
    topic: string,
    event: object,
    options?: PublishOptions,
  ): Promise<PreparedEvent> {
    return {
      topic,
      data: event as any,
      attributes: options?.attributes ?? {},
    };
  }

  async publish(): Promise<void> {}
}

export class MockTransaction extends Transaction implements OutboxTransaction {
  entities: Record<string, any> = {};
  eventTransaction = new OutboxEventTransaction(new MockPublisher());

  clear() {
    this.entities = {};
    this.eventTransaction = new OutboxEventTransaction(new MockPublisher());
  }

  async set<T extends object>(entity: T): Promise<void> {
    this.entities[(entity as any).id] = entity;
  }

  async delete<T extends object>(
    typeOrEntity: Type<T> | T,
    entity?: Partial<T>,
  ): Promise<void> {
    delete this.entities[(entity ?? (typeOrEntity as any)).id];
  }

  async get<T extends object>(
    _: new () => T,
    entity: Partial<T>,
  ): Promise<T | undefined> {
    return this.entities[(entity as any).id];
  }

  async publish(
    topic: string,
    event: object,
    options?: PublishOptions,
  ): Promise<void> {
    await this.eventTransaction.publish(topic, event, options);
  }

  get events() {
    return this.eventTransaction.events;
  }
}

export const mockTransaction: MockTransaction & {
  set: jest.SpiedFunction<StateTransaction['set']>;
  delete: jest.SpiedFunction<StateTransaction['delete']>;
  get: jest.SpiedFunction<StateTransaction['get']>;
} = new MockTransaction() as any;

export class MockRunner extends TransactionRunner<
  MockTransaction,
  MockTransaction
> {
  public async runReadWrite<RT>(
    options: ReadWriteTransactionOptions,
    runFn: TransactionFn<MockTransaction, RT>,
  ): Promise<RT> {
    return await runFn(mockTransaction);
  }

  public async runReadOnly<RT>(
    runFn: TransactionFn<MockTransaction, RT>,
  ): Promise<RT> {
    return await runFn(mockTransaction);
  }
}
