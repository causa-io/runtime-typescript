import { Inject } from '@nestjs/common';

/**
 * The name of the component to inject when an `EventPublisher` is requested.
 */
export const EVENT_PUBLISHER_INJECTION_NAME = 'CAUSA_EVENT_PUBLISHER';

/**
 * Decorates a parameter or property to inject the `EventPublisher`.
 */
export const InjectEventPublisher = () =>
  Inject(EVENT_PUBLISHER_INJECTION_NAME);
