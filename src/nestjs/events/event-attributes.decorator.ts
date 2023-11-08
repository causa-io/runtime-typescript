import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { RequestWithEvent } from './request-with-event.js';

/**
 * Decorates a route handler's parameter to populate it with the attributes of the event.
 */
export const EventAttributes = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithEvent>();
    return request.eventAttributes;
  },
);
