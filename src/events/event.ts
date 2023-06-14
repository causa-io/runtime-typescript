/**
 * A business event emitted by a service.
 * This could correspond to a change in the state of an entity for example.
 */
export type Event<NameType extends string = string, DataType = any> = {
  /**
   * The UUID of the event.
   */
  id: string;

  /**
   * The (business) date at which the event was produced.
   */
  producedAt: Date;

  /**
   * The name of the event that applies to the `data`.
   */
  name: NameType;

  /**
   * The event-specific payload for this event.
   */
  data: DataType;
};

/**
 * The type of the {@link Event.data} property for an event.
 */
export type EventData<T extends Event> = T['data'];

/**
 * The type of the {@link Event.name} for an event.
 */
export type EventName<T extends Event> = T['name'];
