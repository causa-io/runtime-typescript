import {
  type Event,
  type EventPublisher,
  type PublishOptions,
} from '../events/index.js';
import type { EventTransaction } from './event-transaction.js';

/**
 * An event staged as part of a transaction.
 */
type BufferedEvent = {
  /**
   * The topic to which the event should be published when transaction commits.
   */
  topic: string;

  /**
   * The event to publish.
   */
  event: Event;

  /**
   * Options for publishing the event.
   */
  options: PublishOptions;
};

/**
 * An {@link EventTransaction} that buffers events locally until the transaction should be committed.
 * All buffered events are forwarded to the given {@link EventPublisher} when the transaction commits.
 * The transaction runner should call {@link BufferEventTransaction.commit} when the transaction commits.
 */
export class BufferEventTransaction implements EventTransaction {
  /**
   * The staged events that will be published when the transaction commits.
   */
  private readonly bufferedEvents: BufferedEvent[] = [];

  /**
   * Creates a new {@link BufferEventTransaction}.
   *
   * @param publisher The {@link EventPublisher} to which the buffered events will be passed when the transaction
   *   commits.
   */
  constructor(readonly publisher: EventPublisher) {}

  async publish(
    topic: string,
    event: Event,
    options: PublishOptions = {},
  ): Promise<void> {
    this.bufferedEvents.push({ topic, event, options });
  }

  /**
   * Publishes all buffered events to the {@link BufferEventTransaction.publisher}.
   */
  async commit(): Promise<void> {
    await Promise.all(
      this.bufferedEvents.map(({ topic, event, options }) =>
        this.publisher.publish(topic, event, options),
      ),
    );
  }
}
