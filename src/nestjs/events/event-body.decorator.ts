import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestWithEvent } from './request-with-event.js';

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
 * Although it is recommended to use concrete subclasses of `Event` as the type of the parameter, any type can be used.
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
