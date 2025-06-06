import { jest } from '@jest/globals';
import { PinoLogger } from 'nestjs-pino';
import { RetryableError } from '../../errors/index.js';
import type { FindReplaceStateTransaction } from '../find-replace-transaction.js';
import { Transaction } from '../transaction.js';
import { mockStateTransaction } from '../utils.test.js';
import { OutboxEventTransaction } from './event-transaction.js';
import { OutboxTransactionRunner } from './runner.js';
import {
  expectMockStateTransactionReplaceToHaveBeenCalledWith,
  MockPublisher,
  MockSender,
  MyEventType,
} from './utils.test.js';

type MyTransaction = Transaction<
  FindReplaceStateTransaction,
  OutboxEventTransaction
>;

class MyRunner extends OutboxTransactionRunner<MyTransaction> {
  protected async runStateTransaction<RT>(
    eventTransactionFactory: () => OutboxEventTransaction,
    runFn: (transaction: MyTransaction) => Promise<RT>,
  ): Promise<RT> {
    while (true) {
      try {
        const transaction = new Transaction(
          mockStateTransaction as unknown as FindReplaceStateTransaction,
          eventTransactionFactory(),
        );

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

  beforeAll(() => {
    logger = new PinoLogger({});
    publisher = new MockPublisher();
    sender = new MockSender(publisher, logger, { pollingInterval: 0 });
    runner = new MyRunner(MyEventType, sender, logger);

    jest.spyOn(sender, 'publish').mockResolvedValue();
  });

  afterEach(() => {
    mockStateTransaction.clear();
  });

  describe('run', () => {
    it('should execute the function in the transaction, commit events, and publish them', async () => {
      const beforeTransaction = new Date();

      const actualResult = await runner.run(async (transaction) => {
        expect(transaction.stateTransaction).toBe(mockStateTransaction);
        expect(transaction.eventTransaction).toBeInstanceOf(
          OutboxEventTransaction,
        );

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
      expectMockStateTransactionReplaceToHaveBeenCalledWith(expectedEvents);
      expect(sender.publish).toHaveBeenCalledExactlyOnceWith(
        expect.toIncludeAllMembers(expectedEvents),
      );
    });

    it('should not replace outbox events nor publish them if there are no events', async () => {
      const actualResult = await runner.run(async (transaction) => {
        expect(transaction.stateTransaction).toBe(mockStateTransaction);
        expect(transaction.eventTransaction).toBeInstanceOf(
          OutboxEventTransaction,
        );
        return '🎉';
      });

      expect(actualResult).toEqual(['🎉']);
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
      expect(sender.publish).not.toHaveBeenCalled();
    });

    it('should not publish events if the transaction fails', async () => {
      jest
        .spyOn(runner as any, 'runStateTransaction')
        .mockImplementationOnce(
          async (eventTransactionFactory: any, runFn: any) => {
            await runFn(
              new Transaction(
                mockStateTransaction as unknown as FindReplaceStateTransaction,
                eventTransactionFactory(),
              ),
            );
            throw new Error('💥');
          },
        );

      const actualPromise = runner.run(async (transaction) => {
        await transaction.publish('topic1', { id: '1' } as any, { key: '1' });
      });

      await expect(actualPromise).rejects.toThrow('💥');
      expectMockStateTransactionReplaceToHaveBeenCalledWith([
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
