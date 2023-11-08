/**
 * An (express) request with an added (parsed) event.
 * This type is used by the event decorators to retrieve the parsed event.
 * The {@link RequestWithEvent.eventBody} and {@link RequestWithEvent.eventAttributes} should be added by the event
 * handler interceptor.
 */
export type RequestWithEvent = {
  /**
   * The parsed event.
   */
  eventBody: any;

  /**
   * The attributes sent along with the event.
   */
  eventAttributes: Record<string, string>;
};
