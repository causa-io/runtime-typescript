import type { OnApplicationShutdown } from '@nestjs/common';
import type { EventPublisher } from '../../events/index.js';
import { Logger } from '../../nestjs/index.js';
import type { OutboxEvent } from './event.js';

/**
 * The result of publishing outbox events.
 * Keys are the IDs of the events, values are whether the event was successfully published.
 * This is used to update the outbox after publishing.
 */
export type OutboxEventPublishResult = { [id: string]: boolean };

/**
 * Options for the {@link OutboxEventSender}.
 */
export type OutboxEventSenderOptions = {
  /**
   * The maximum number of events to publish in a single batch when polling the outbox.
   */
  readonly batchSize?: number;

  /**
   * The interval, in milliseconds, at which to poll the outbox for events to publish.
   * If `0` is passed, the outbox will not be polled.
   */
  readonly pollingInterval?: number;

  /**
   * The duration, in milliseconds, for which the sender acquires a lease on events to publish.
   */
  readonly leaseDuration?: number;
};

/**
 * The default batch size to use when polling the outbox for events.
 */
const DEFAULT_BATCH_SIZE = 100;

/**
 * The default interval, in milliseconds, to use when polling the outbox for events.
 */
const DEFAULT_POLLING_INTERVAL = 10000;

/**
 * The default duration, in milliseconds, for which the sender acquires a lease on events to publish.
 */
const DEFAULT_LEASE_DURATION = 30000;

/**
 * A sender that polls an outbox for events and publishes them.
 */
export abstract class OutboxEventSender implements OnApplicationShutdown {
  /**
   * The maximum number of events to publish in a single batch when polling the outbox.
   */
  readonly batchSize: number;

  /**
   * The interval at which to poll the outbox for events to publish.
   */
  readonly pollingInterval: number;

  /**
   * The duration for which the sender acquires a lease on events to publish.
   */
  readonly leaseDuration: number;

  /**
   * The Node.js timeout / interval used to poll the outbox for events.
   */
  protected readonly pollingIntervalTimeout: NodeJS.Timeout | undefined;

  /**
   * The ongoing polling operation, if any.
   * This is awaited when the application is shutting down.
   */
  protected ongoingPolling: Promise<void> | undefined;

  /**
   * The ongoing publishing operations.
   * These are awaited when the application is shutting down.
   */
  protected readonly ongoingPublishing = new Set<Promise<void>>();

  /**
   * Whether the application is shutting down.
   */
  protected isShuttingDown = false;

  /**
   * Creates a new {@link OutboxEventSender}.
   *
   * @param publisher The {@link EventPublisher} to use to publish events.
   * @param options Options for the {@link OutboxEventSender}.
   */
  constructor(
    readonly publisher: EventPublisher,
    readonly logger: Logger,
    options: OutboxEventSenderOptions = {},
  ) {
    this.logger.setContext(OutboxEventSender.name);

    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.pollingInterval = options.pollingInterval ?? DEFAULT_POLLING_INTERVAL;
    this.leaseDuration = options.leaseDuration ?? DEFAULT_LEASE_DURATION;

    this.pollingIntervalTimeout = this.pollingInterval
      ? setInterval(() => this.pollOutboxAtInterval(), this.pollingInterval)
      : undefined;
  }

  async onApplicationShutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (this.pollingIntervalTimeout) {
      clearInterval(this.pollingIntervalTimeout);
    }

    await Promise.allSettled([this.ongoingPolling, ...this.ongoingPublishing]);
  }

  /**
   * Fetches events from the outbox to publish.
   * This should be implemented by subclasses, and return a maximum of {@link OutboxEventSender.batchSize} events.
   * The lease for the events should be computed using {@link OutboxEventSender.leaseDuration}.
   *
   * @returns The events to publish.
   */
  protected abstract fetchEvents(): Promise<OutboxEvent[]>;

  /**
   * Updates the outbox after publishing events.
   * This should be implemented by subclasses, to delete events that were successfully published and release the lease
   * on events that were not.
   *
   * @param result The result used to update the outbox after publishing.
   */
  protected abstract updateOutbox(
    result: OutboxEventPublishResult,
  ): Promise<void>;

  /**
   * This runs at regular intervals to poll the outbox for events to publish.
   * No polling is triggered if there is already an ongoing polling operation or if the application is shutting down.
   */
  protected async pollOutboxAtInterval(): Promise<void> {
    if (this.ongoingPolling || this.isShuttingDown) {
      return;
    }

    this.ongoingPolling = this.pollOutbox();
    await this.ongoingPolling;
    this.ongoingPolling = undefined;
  }

  /**
   * Fetches events from the outbox and publishes them.
   */
  async pollOutbox(): Promise<void> {
    let events: OutboxEvent[];
    try {
      events = await this.fetchEvents();
    } catch (error: any) {
      this.logger.error(
        { error: error.stack },
        'Failed to fetch events from the outbox.',
      );
      return;
    }

    const numPolledOutboxEvents = events.length;
    if (numPolledOutboxEvents === 0) {
      return;
    }

    this.logger.info(
      { numPolledOutboxEvents },
      'Publishing events polled from outbox.',
    );
    await this.publish(events);
  }

  /**
   * Publishes the given outbox events using the underlying {@link OutboxEventSender.publisher}.
   * This also updates the outbox after publishing.
   * This does not try to publish the events if the application is shutting down. This is considered okay as events
   * should be in the outbox and can be picked up by another instance of the sender.
   *
   * @param events The events to publish.
   */
  async publish(events: OutboxEvent[]): Promise<void> {
    if (events.length === 0 || this.isShuttingDown) {
      return;
    }

    let resolve!: () => void;
    const ongoingPromise = new Promise<void>((r) => (resolve = r));
    this.ongoingPublishing.add(ongoingPromise);

    const resultEntries = await Promise.all(
      events.map(async (e): Promise<[string, boolean]> => {
        try {
          await this.publisher.publish({
            topic: e.topic,
            data: e.data,
            attributes: e.attributes,
          });
          return [e.id, true];
        } catch (error: any) {
          this.logger.error(
            { error: error.stack, outboxEventId: e.id },
            'Failed to publish an event.',
          );
          return [e.id, false];
        }
      }),
    );

    const numBatchedEvents = resultEntries.length;
    const numPublishedEvents = resultEntries.filter(
      ([, success]) => success,
    ).length;
    const numFailedEvents = numBatchedEvents - numPublishedEvents;
    this.logger.info(
      { numBatchedEvents, numPublishedEvents, numFailedEvents },
      'Finished publishing events.',
    );

    const result = Object.fromEntries(resultEntries);

    try {
      await this.updateOutbox(result);
    } catch (error: any) {
      this.logger.error({ error: error.stack }, 'Failed to update the outbox.');
    }

    this.ongoingPublishing.delete(ongoingPromise);
    resolve();
  }
}
