/**
 * A set of attributes that can be sent along with an event.
 * This can help with filtering events or for deserialization. However, the content of the event itself should be enough
 * to interpret and process it.
 */
export type EventAttributes = Record<string, string>;

/**
 * A set of options when publishing an event.
 */
export type PublishOptions = {
  /**
   * Attributes to send along with the event.
   * This may not be supported by all publishers.
   */
  attributes?: EventAttributes;

  /**
   * The key used for partitioning or ordering the event.
   * This may not be supported by all publishers.
   */
  key?: string;
};

/**
 * A publisher of business events.
 */
export interface EventPublisher {
  /**
   * Flushes the publisher, such that all buffered messages are sent.
   */
  flush(): Promise<void>;

  /**
   * Publishes a new event.
   *
   * @param topic The topic to publish the event to.
   * @param event The event to publish. Although it is recommended to use concrete subclasses of `Event` as events, any
   *   type that can be serialized is supported.
   * @param options Additional publishing options.
   */
  publish(
    topic: string,
    event: object,
    options?: PublishOptions,
  ): Promise<void>;
}
