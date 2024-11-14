import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { PUBLIC_ROUTE_METADATA_KEY } from './public.decorator.js';

/**
 * An auth guard that requires a bearer token, in the form of a JSON Web Token.
 * Methods and controllers decorated with the `Public` decorator are not checked.
 */
@Injectable()
export class BearerAuthGuard extends AuthGuard('bearer') {
  constructor(private readonly reflector: Reflector) {
    super({});
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
