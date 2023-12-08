import { SetMetadata } from '@nestjs/common';

/**
 * The metadata key for the {@link UseEventHandler} decorator.
 */
export const EVENT_HANDLER_KEY = 'CAUSA_EVENT_HANDLER';

/**
 * Decorates a controller or route handler to specify the event handler to use.
 * This is only needed if several event handler interceptors are registered.
 *
 * @param eventHandler The ID of the event handler to use.
 */
export const UseEventHandler = (eventHandler: string) =>
  SetMetadata(EVENT_HANDLER_KEY, eventHandler);
