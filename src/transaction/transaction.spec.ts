import 'jest-extended';
import { TransactionOldTimestampError } from './errors.js';
import { Transaction } from './transaction.js';
import { MockTransaction } from './utils.test.js';

describe('Transaction', () => {
  let transaction: Transaction;

  beforeEach(() => {
    transaction = new MockTransaction();
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
