import * as uuid from 'uuid';
import type { EventPublisher, PublishOptions } from '../../events/index.js';
import type { EventTransaction } from '../event-transaction.js';
import type { OutboxEvent } from './event.js';

/**
 * An event that should be published as part of a transaction, if the transaction is successfully committed.
 */
export type StagedOutboxEvent = Omit<OutboxEvent, 'leaseExpiration'>;

/**
 * An {@link EventTransaction} that stages events to be emitted as part of a transaction.
 */
export class OutboxEventTransaction implements EventTransaction {
  /**
   * The events to publish as part of the transaction.
   */
  readonly events: StagedOutboxEvent[] = [];

  /**
   * Creates a new {@link OutboxEventTransaction}.
   * The passed {@link EventPublisher} will be used to prepare events for publishing, but not for actual publishing.
   *
   * @param publisher The {@link EventPublisher} to use to prepare events for publishing.
   */
  constructor(private readonly publisher: EventPublisher) {}

  async publish(
    topic: string,
    event: object,
    options: PublishOptions = {},
  ): Promise<void> {
    const prepared = await this.publisher.prepare(topic, event, options);

    const staged: StagedOutboxEvent = {
      id: uuid.v4(),
      topic: prepared.topic,
      data: prepared.data,
      attributes: prepared.attributes ?? {},
    };

    this.events.push(staged);
  }
}
