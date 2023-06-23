import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * An (express) request with an added (parsed) event.
 * This type is used by the {@link EventBody} decorator to retrieve the parsed event.
 * The {@link RequestWithEvent.eventBody} should be added by the event handler interceptor.
 */
export type RequestWithEvent = {
  /**
   * The parsed event.
   */
  eventBody: any;
};

/**
 * The metadata key in which the type of the event for a handler is stored.
 */
export const EVENT_BODY_TYPE_KEY = 'CAUSA_EVENT_BODY_TYPE';

/**
 * A basic decorator that populates the parameter with the event parsed by the corresponding interceptor.
 */
const bodyDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithEvent>();
    return request.eventBody;
  },
)();

/**
 * Decorates a route handler's parameter to populate it with a parsed event.
 * The type of the parameter should be a concrete class of an `Event`.
 */
export const EventBody = () => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const types = Reflect.getMetadata('design:paramtypes', target, propertyKey);

    Reflect.defineMetadata(
      EVENT_BODY_TYPE_KEY,
      types[parameterIndex],
      (target as any)[propertyKey],
    );

    // This decorator simply populates the data that has already been parsed by the interceptor.
    bodyDecorator(target, propertyKey, parameterIndex);
  };
};
