import { jest } from '@jest/globals';
import { PinoLogger } from 'nestjs-pino';
import { RetryableError } from '../../errors/index.js';
import type { PublishOptions } from '../../events/publisher.js';
import { MockTransaction } from '../utils.test.js';
import {
  OutboxEventTransaction,
  type OutboxTransaction,
} from './event-transaction.js';
import { OutboxTransactionRunner } from './runner.js';
import { MockPublisher, MockSender, MyEventType } from './utils.test.js';

class MyTransaction extends MockTransaction implements OutboxTransaction {
  constructor(readonly eventTransaction: OutboxEventTransaction) {
    super();
  }

  // Even though the concept is the same, this stores staged events in the `eventTransaction` rather than the `buffer`.
  async publish(
    topic: string,
    event: object,
    options?: PublishOptions,
  ): Promise<void> {
    await this.eventTransaction.publish(topic, event, options);
  }
}

class MyRunner extends OutboxTransactionRunner<MyTransaction> {
  protected async runStateTransaction<RT>(
    eventTransactionFactory: () => OutboxEventTransaction,
    runFn: (transaction: MyTransaction) => Promise<RT>,
  ): Promise<RT> {
    while (true) {
      try {
        const transaction = new MyTransaction(eventTransactionFactory());

        return await runFn(transaction);
      } catch (error) {
        if (error instanceof RetryableError) {
          continue;
        }

        throw error;
      }
    }
  }
}

describe('OutboxTransactionRunner', () => {
  let logger: PinoLogger;
  let publisher: MockPublisher;
  let sender: MockSender;
  let runner: MyRunner;

  let myTransaction!: MyTransaction;

  beforeAll(() => {
    logger = new PinoLogger({});
    publisher = new MockPublisher();
    sender = new MockSender(publisher, logger, { pollingInterval: 0 });
    runner = new MyRunner(MyEventType, sender, logger);

    jest.spyOn(sender, 'publish').mockResolvedValue();
  });

  afterEach(() => {
    myTransaction = undefined as any;
  });

  describe('run', () => {
    it('should execute the function in the transaction, commit events, and publish them', async () => {
      const beforeTransaction = new Date();

      const actualResult = await runner.run(async (transaction) => {
        myTransaction = transaction;
        expect(transaction.eventTransaction).toBeInstanceOf(
          OutboxEventTransaction,
        );
        expect((transaction.eventTransaction as any).publisher).toBe(publisher);

        await transaction.publish('topic1', { id: '1' } as any, { key: '1' });
        await transaction.publish('topic2', { id: '2' } as any, {
          attributes: { someKey: '🎁' },
        });

        return '🎉';
      });

      expect(actualResult).toEqual(['🎉']);
      const expectedEvents = [
        new MyEventType({
          id: expect.any(String),
          topic: 'topic1',
          data: Buffer.from('{"id":"1"}'),
          attributes: { prepared: '✅' },
          leaseExpiration: expect.toBeAfter(beforeTransaction),
        }),
        new MyEventType({
          id: expect.any(String),
          topic: 'topic2',
          data: Buffer.from('{"id":"2"}'),
          attributes: { prepared: '✅', someKey: '🎁' },
          leaseExpiration: expect.toBeAfter(beforeTransaction),
        }),
      ];
      expect(Object.values(myTransaction.entities)).toIncludeAllMembers(
        expectedEvents,
      );
      expect(sender.publish).toHaveBeenCalledExactlyOnceWith(
        expect.toIncludeAllMembers(expectedEvents),
      );
    });

    it('should not replace outbox events nor publish them if there are no events', async () => {
      const actualResult = await runner.run(async (transaction) => {
        myTransaction = transaction;
        expect(transaction.eventTransaction).toBeInstanceOf(
          OutboxEventTransaction,
        );
        return '🎉';
      });

      expect(actualResult).toEqual(['🎉']);
      expect(myTransaction.entities).toEqual({});
      expect(sender.publish).not.toHaveBeenCalled();
    });

    it('should not publish events if the transaction fails', async () => {
      jest
        .spyOn(runner as any, 'runStateTransaction')
        .mockImplementationOnce(
          async (eventTransactionFactory: any, runFn: any) => {
            const transaction = new MyTransaction(eventTransactionFactory());
            await runFn(transaction);
            throw new Error('💥');
          },
        );

      const actualPromise = runner.run(async (transaction) => {
        myTransaction = transaction;
        await transaction.publish('topic1', { id: '1' } as any, { key: '1' });
      });

      await expect(actualPromise).rejects.toThrow('💥');
      expect(Object.values(myTransaction.entities)).toEqual([
        new MyEventType({
          id: expect.any(String),
          topic: 'topic1',
          data: Buffer.from('{"id":"1"}'),
          attributes: { prepared: '✅' },
          leaseExpiration: expect.any(Date),
        }),
      ]);
      expect(sender.publish).not.toHaveBeenCalled();
    });

    it('should create a new event transaction when the transaction is retried', async () => {
      const observedEventTransactions: OutboxEventTransaction[] = [];

      const actualResult = await runner.run(async (transaction) => {
        observedEventTransactions.push(transaction.eventTransaction);
        const transactionCount = observedEventTransactions.length;

        await transaction.publish('topic1', {
          id: transactionCount.toFixed(),
        } as any);

        if (transactionCount < 2) {
          throw new RetryableError('');
        }
        return '🎉';
      });

      expect(actualResult).toEqual(['🎉']);
      expect(sender.publish).toHaveBeenCalledExactlyOnceWith([
        new MyEventType({
          id: expect.any(String),
          topic: 'topic1',
          data: Buffer.from('{"id":"2"}'),
          attributes: { prepared: '✅' },
          leaseExpiration: expect.any(Date),
        }),
      ]);
      expect(observedEventTransactions).toHaveLength(2);
      expect(observedEventTransactions[0]).toBeInstanceOf(
        OutboxEventTransaction,
      );
      expect(observedEventTransactions[1]).toBeInstanceOf(
        OutboxEventTransaction,
      );
      expect(observedEventTransactions[0]).not.toBe(
        observedEventTransactions[1],
      );
    });
  });
});
