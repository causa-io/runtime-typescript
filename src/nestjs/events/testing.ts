import type { Fixture } from '../app/testing.js';

/**
 * A {@link Fixture} that provides methods to test events published by a NestJS application.
 */
export interface EventFixture extends Fixture {
  /**
   * Checks that the given event has been published to the specified topic.
   *
   * @param topic The name of the event topic.
   * @param expectedEvent The event expected to have been published.
   * @param options Options for the expectation.
   */
  expectEvent(
    topic: string,
    expectedEvent: any,
    options?: {
      /**
       * The attributes expected to have been published with the event.
       * This may contain only a subset of the attributes.
       */
      attributes?: Record<string, string>;
    },
  ): Promise<void>;

  /**
   * Checks that no message has been published to the given topic.
   *
   * @param topic The name of the topic.
   */
  expectNoEvent(topic: string): Promise<void>;
}
