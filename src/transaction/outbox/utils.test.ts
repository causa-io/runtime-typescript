import type {
  EventAttributes,
  EventPublisher,
  PreparedEvent,
  PublishOptions,
} from '../../events/index.js';
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
