import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '../../auth/index.js';

/**
 * Decorator for controller methods that fetch the {@link User} object from the request.
 */
export const AuthUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
