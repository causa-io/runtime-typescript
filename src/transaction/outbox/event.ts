import type { EventAttributes } from '../../events/index.js';

/**
 * An event that can be stored in an outbox and published later.
 */
export interface OutboxEvent {
  /**
   * The unique identifier of the event.
   */
  readonly id: string;

  /**
   * The topic to which the event should be published.
   */
  readonly topic: string;

  /**
   * The serialized payload of the event.
   */
  readonly data: Buffer;

  /**
   * Attributes to send along with the event.
   * This may not be supported by all publishers.
   */
  readonly attributes: EventAttributes;

  /**
   * The date after which the event can be polled by a sender.
   * If the date is in the future, a sender is currently trying to publish the event.
   */
  readonly leaseExpiration?: Date | null;
}
