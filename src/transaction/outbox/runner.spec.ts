import { jest } from '@jest/globals';
import { PinoLogger } from 'nestjs-pino';
import { RetryableError } from '../../errors/index.js';
import type {
  ReadWriteTransactionOptions,
  TransactionFn,
} from '../transaction-runner.js';
import { MockTransaction } from '../utils.test.js';
import { OutboxEventTransaction } from './event-transaction.js';
import { OutboxTransactionRunner } from './runner.js';
import { MockPublisher, MockSender, MyEventType } from './utils.test.js';

class MyRunner extends OutboxTransactionRunner<
  MockTransaction,
  MockTransaction
> {
  async runReadOnly<RT>(
    runFn: TransactionFn<MockTransaction, RT>,
  ): Promise<RT> {
    return await runFn(new MockTransaction());
  }

  async runStateTransaction<RT>(
    eventTransactionFactory: () => OutboxEventTransaction,
    options: ReadWriteTransactionOptions,
    runFn: TransactionFn<MockTransaction, RT>,
  ): Promise<RT> {
    while (true) {
      try {
        const transaction = new MockTransaction();
        transaction.eventTransaction = eventTransactionFactory();

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

  let myTransaction!: MockTransaction;

  beforeAll(() => {
    logger = new PinoLogger({});
    publisher = new MockPublisher();
    sender = new MockSender(publisher, logger, { pollingInterval: 0 });
    runner = new MyRunner(MyEventType, sender, logger);

    jest
      .spyOn(sender, 'publish')
      .mockResolvedValue({ result: {}, outboxUpdated: true });
  });

  afterEach(() => {
    myTransaction = undefined as any;
  });

  describe('run', () => {
    it('should execute the function in the transaction, commit events, and publish them', async () => {
      const beforeTransaction = new Date();

      const actualResult = await runner.run(
        { publishOptions: { attributes: { att1: '💮' } } },
        async (transaction) => {
          myTransaction = transaction;
          expect(transaction.eventTransaction).toBeInstanceOf(
            OutboxEventTransaction,
          );
          expect(transaction.eventTransaction['publisher']).toBe(publisher);

          await transaction.publish('topic1', { id: '1' }, { key: '1' });
          await transaction.publish(
            'topic2',
            { id: '2' },
            { attributes: { someKey: '🎁' } },
          );

          return '🎉';
        },
      );

      expect(actualResult).toEqual('🎉');
      const expectedEvents = [
        new MyEventType({
          id: expect.any(String),
          topic: 'topic1',
          data: Buffer.from('{"id":"1"}'),
          attributes: { prepared: '✅', att1: '💮' },
          leaseExpiration: expect.toBeAfter(beforeTransaction),
        }),
        new MyEventType({
          id: expect.any(String),
          topic: 'topic2',
          data: Buffer.from('{"id":"2"}'),
          attributes: { prepared: '✅', att1: '💮', someKey: '🎁' },
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

      expect(actualResult).toEqual('🎉');
      expect(myTransaction.entities).toEqual({});
      expect(sender.publish).not.toHaveBeenCalled();
    });

    it('should not publish events if the transaction fails', async () => {
      jest
        .spyOn(runner, 'runStateTransaction')
        .mockImplementationOnce(
          async (eventTransactionFactory, options, runFn) => {
            const transaction = new MockTransaction();
            transaction.eventTransaction = eventTransactionFactory();
            await runFn(transaction);
            throw new Error('💥');
          },
        );

      const actualPromise = runner.run(async (transaction) => {
        myTransaction = transaction;
        await transaction.publish('topic1', { id: '1' }, { key: '1' });
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
        });

        if (transactionCount < 2) {
          throw new RetryableError('');
        }
        return '🎉';
      });

      expect(actualResult).toEqual('🎉');
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
