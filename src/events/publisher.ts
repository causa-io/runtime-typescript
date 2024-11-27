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
  readonly attributes?: EventAttributes;

  /**
   * The key used for partitioning or ordering the event.
   * This may not be supported by all publishers.
   */
  readonly key?: string;
};

/**
 * An event that has been serialized, along with its final publish options.
 */
export type PreparedEvent = {
  /**
   * The topic to which the event should be published.
   */
  readonly topic: string;

  /**
   * The serialized payload of the event.
   */
  readonly data: Buffer;
} & PublishOptions;

/**
 * A publisher of business events.
 */
export interface EventPublisher {
  /**
   * Flushes the publisher, such that all buffered messages are sent.
   */
  flush(): Promise<void>;

  /**
   * Serializes the event payload and computes the final publish options.
   *
   * @param topic The topic to publish the event to.
   * @param event The payload of the event.
   * @param options Publishing options.
   * @returns The {@link PreparedEvent}.
   */
  prepare(
    topic: string,
    event: object,
    options?: PublishOptions,
  ): Promise<PreparedEvent>;

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

  /**
   * Publishes a previously prepared event.
   * An event can be prepared using {@link EventPublisher.prepare}.
   *
   * @param prepared The prepared event to publish.
   */
  publish(prepared: PreparedEvent): Promise<void>;
}
