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

/**
 * An event with a subset of the data of the original event.
 *
 * This can be used with both typed and "serialized" events, to indicate that a consumer only relies on a subset of the
 * data (and possibly an older version) of the event.
 */
export type EventWithPickedData<
  // The full `Event` type is not used here to allow for "serialized" events types to be used.
  E extends { data: object },
  K extends keyof E['data'],
> = Omit<E, 'data'> & {
  /**
   * The event-specific partial payload for this event.
   */
  data: Pick<E['data'], K>;
};
