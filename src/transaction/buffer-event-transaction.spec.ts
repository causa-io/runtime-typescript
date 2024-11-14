import { jest } from '@jest/globals';
import type { Event, EventPublisher } from '../events/index.js';
import { BufferEventTransaction } from './buffer-event-transaction.js';

class MyPublisher implements EventPublisher {
  async flush(): Promise<void> {
    // No-op.
  }

  async publish(): Promise<void> {
    // No-op.
  }
}

describe('BufferEventTransaction', () => {
  let publisher: MyPublisher;
  let transaction: BufferEventTransaction;

  beforeEach(() => {
    publisher = new MyPublisher();
    transaction = new BufferEventTransaction(publisher);
    jest.spyOn(publisher, 'publish');
  });

  it('should buffer events and publish them when committing', async () => {
    const event1: Event = {
      id: '1',
      producedAt: new Date(),
      name: '✨',
      data: {},
    };
    const event2: Event = {
      id: '2',
      producedAt: new Date(),
      name: '📫',
      data: {},
    };
    const event3: Event = {
      id: '3',
      producedAt: new Date(),
      name: '🛩️',
      data: {},
    };

    await transaction.publish('topic1', event1);
    await transaction.publish('topic2', event2);
    await transaction.publish('topic3', event3, {
      attributes: { att1: '🎁' },
      key: '🔑',
    });

    expect(publisher.publish).not.toHaveBeenCalled();

    await transaction.commit();

    expect(publisher.publish).toHaveBeenCalledTimes(3);
    expect(publisher.publish).toHaveBeenCalledWith('topic1', event1, {});
    expect(publisher.publish).toHaveBeenCalledWith('topic2', event2, {});
    expect(publisher.publish).toHaveBeenCalledWith('topic3', event3, {
      attributes: { att1: '🎁' },
      key: '🔑',
    });
  });
});
