import { OutboxEventTransaction } from './event-transaction.js';
import { MockPublisher } from './utils.test.js';

describe('OutboxEventTransaction', () => {
  let publisher: MockPublisher;
  let transaction: OutboxEventTransaction;

  beforeAll(() => {
    publisher = new MockPublisher();
  });

  beforeEach(() => {
    transaction = new OutboxEventTransaction(publisher, {
      attributes: { att1: '🌱' },
    });
  });

  describe('publish', () => {
    it('should prepare and stage the event', async () => {
      const event = { type: 'TestEvent' };

      await transaction.publish('test-topic', event);

      expect(transaction.events).toEqual([
        {
          topic: 'test-topic',
          data: Buffer.from(JSON.stringify(event)),
          attributes: { att1: '🌱', prepared: '✅' },
          id: expect.any(String),
        },
      ]);
      expect(transaction.events[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('should override transaction-wide attributes', async () => {
      const event = { type: 'TestEvent' };

      await transaction.publish('test-topic', event, {
        attributes: { att1: '🍀', att2: '🌼' },
      });

      expect(transaction.events).toEqual([
        {
          topic: 'test-topic',
          data: Buffer.from(JSON.stringify(event)),
          attributes: { att1: '🍀', att2: '🌼', prepared: '✅' },
          id: expect.any(String),
        },
      ]);
      expect(transaction.events[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });
  });
});
