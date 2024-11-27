import type {
  EventAttributes,
  EventPublisher,
  PreparedEvent,
  PublishOptions,
} from '../../events/index.js';
import { mockStateTransaction } from '../utils.test.js';
import type { OutboxEvent } from './event.js';
import { OutboxEventSender } from './sender.js';

export class MyEventType implements OutboxEvent {
  constructor(init: MyEventType) {
    Object.assign(this, init);
  }

  readonly id!: string;
  readonly topic!: string;
  readonly data!: Buffer;
  readonly attributes!: EventAttributes;
  readonly key?: string | null;
  readonly leaseExpiration?: Date | null;
}

export class MockPublisher implements EventPublisher {
  async prepare(
    topic: string,
    event: object,
    options?: PublishOptions,
  ): Promise<PreparedEvent> {
    return {
      ...options,
      topic,
      data: Buffer.from(JSON.stringify(event)),
      attributes: { prepared: '✅', ...options?.attributes },
    };
  }

  async publish(): Promise<void> {}

  async flush(): Promise<void> {}
}

export class MockSender extends OutboxEventSender {
  protected async fetchEvents(): Promise<OutboxEvent[]> {
    return [];
  }

  protected async updateOutbox(): Promise<void> {}
}

export function expectMockStateTransactionReplaceToHaveBeenCalledWith(
  expectedEntities: any[],
) {
  expect(mockStateTransaction.replace).toHaveBeenCalledTimes(
    expectedEntities.length,
  );
  expectedEntities.forEach((e) => {
    expect(mockStateTransaction.replace).toHaveBeenCalledWith(
      expect.toSatisfy((actual) => {
        try {
          expect(actual).toEqual(e);
          expect(actual).toBeInstanceOf(e.constructor);
          return true;
        } catch {
          return false;
        }
      }),
    );
  });
}
