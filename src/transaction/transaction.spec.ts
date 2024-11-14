import { jest } from '@jest/globals';
import 'jest-extended';
import type { Event } from '../events/index.js';
import { TransactionOldTimestampError } from './errors.js';
import type { EventTransaction } from './event-transaction.js';
import { Transaction } from './transaction.js';

describe('Transaction', () => {
  const stateTransaction = {};
  const eventTransaction: EventTransaction = {
    publish: jest.fn(() => Promise.resolve()),
  };
  let transaction: Transaction<object, EventTransaction>;

  beforeEach(() => {
    transaction = new Transaction(stateTransaction, eventTransaction);
  });

  it('should expose the state and event transactions', () => {
    expect(transaction.stateTransaction).toBe(stateTransaction);
    expect(transaction.eventTransaction).toBe(eventTransaction);
  });

  describe('publish', () => {
    it('should forward the call to the event transaction', async () => {
      const expectedTopic = 'topic';
      const expectedEvent: Event = {
        id: '1',
        producedAt: new Date(),
        name: '✨',
        data: {},
      };
      const expectedOptions = { attributes: { att1: '🎁' } };

      await transaction.publish(expectedTopic, expectedEvent, expectedOptions);

      expect(eventTransaction.publish).toHaveBeenCalledExactlyOnceWith(
        expectedTopic,
        expectedEvent,
        expectedOptions,
      );
    });
  });

  describe('validatePastDateOrFail', () => {
    it('should not throw if the given date is in the past', () => {
      const date = new Date(transaction.timestamp.getTime() - 1000);

      expect(() => transaction.validatePastDateOrFail(date)).not.toThrow();
    });

    it('should throw if the given date is in the future', () => {
      const expectedDelay = 1000;
      const date = new Date(transaction.timestamp.getTime() + expectedDelay);

      expect(() => transaction.validatePastDateOrFail(date)).toThrow(
        TransactionOldTimestampError,
      );
      expect(() => transaction.validatePastDateOrFail(date)).toThrow(
        expect.objectContaining({
          delay: expectedDelay,
        }),
      );
    });

    it('should throw if dates are equal', () => {
      const date = new Date(transaction.timestamp);

      expect(() => transaction.validatePastDateOrFail(date)).toThrow(
        TransactionOldTimestampError,
      );
    });

    it('should not throw if the given date is undefined', () => {
      expect(() => transaction.validatePastDateOrFail(undefined)).not.toThrow();
    });
  });
});
