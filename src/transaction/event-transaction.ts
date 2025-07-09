import type { PublishOptions } from '../events/index.js';

/**
 * Options for publishing events as part of a transaction.
 */
export type TransactionPublishOptions = Pick<PublishOptions, 'attributes'>;

/**
 * A transaction object used to represent events that should be published atomically.
 */
export interface EventTransaction {
  /**
   * Base options for publishing events as part of the transaction.
   * Attributes can be overridden when calling {@link EventTransaction.publish}.
   */
  readonly publishOptions: TransactionPublishOptions;

  /**
   * Adds the given event to the transaction.
   * It will be published if the transaction successfully commits.
   *
   * @param topic The topic to which the event should be published.
   * @param event The event to publish.
   * @param options Options for publishing the event.
   */
  publish(
    topic: string,
    event: object,
    options?: PublishOptions,
  ): Promise<void>;
}
