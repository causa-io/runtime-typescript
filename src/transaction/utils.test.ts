import { jest } from '@jest/globals';
import type { Type } from '@nestjs/common';
import type { PublishOptions } from '../events/index.js';
import {
  BufferEventTransaction,
  type StateTransaction,
  Transaction,
  TransactionRunner,
} from './index.js';

export class MockTransaction extends Transaction {
  entities: Record<string, any> = {};
  buffer: BufferEventTransaction = new BufferEventTransaction({} as any);

  clear() {
    this.entities = {};
    this.buffer = new BufferEventTransaction({} as any);
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
    await this.buffer.publish(topic, event, options);
  }

  get bufferedEvents() {
    return (this.buffer as any).bufferedEvents;
  }
}

export const mockTransaction: MockTransaction & {
  set: jest.SpiedFunction<StateTransaction['set']>;
  delete: jest.SpiedFunction<StateTransaction['delete']>;
  get: jest.SpiedFunction<StateTransaction['get']>;
} = new MockTransaction() as any;
jest.spyOn(mockTransaction, 'set');
jest.spyOn(mockTransaction, 'delete');
jest.spyOn(mockTransaction, 'get');

export class MockRunner extends TransactionRunner<MockTransaction> {
  async run<RT>(
    runFn: (transaction: MockTransaction) => Promise<RT>,
  ): Promise<[RT]> {
    return [await runFn(mockTransaction)];
  }
}
