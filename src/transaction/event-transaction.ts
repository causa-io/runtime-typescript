import { Event, PublishOptions } from '../events/index.js';

/**
 * A transaction object used to represent events that should be published atomically.
 */
export interface EventTransaction {
  /**
   * Adds the given event to the transaction.
   * It will be published if the transaction successfully commits.
   *
   * @param topic The topic to which the event should be published.
   * @param event The event to publish.
   * @param options Options for publishing the event.
   */
  publish(topic: string, event: Event, options: PublishOptions): Promise<void>;
}
