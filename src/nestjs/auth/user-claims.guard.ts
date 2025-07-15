import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  type UserClaimRequirements,
  doesUserSatisfyClaimRequirements,
} from '../../auth/index.js';
import { ForbiddenErrorDto } from '../errors/errors.dto.js';
import { throwHttpErrorResponse } from '../errors/http-error.js';
import { USER_CLAIM_REQUIREMENTS_KEY } from './require-user-claims.decorator.js';

/**
 * A guard that checks user claims for routes decorated with the `RequireUserClaims` decorator.
 */
@Injectable()
export class UserClaimsGuard implements CanActivate {
  /**
   * Creates a new {@link UserClaimsGuard}.
   *
   * @param reflector The reflector to access decorator data.
   */
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirements =
      this.reflector.getAllAndOverride<UserClaimRequirements>(
        USER_CLAIM_REQUIREMENTS_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requirements) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    const satisfiesRequirements = doesUserSatisfyClaimRequirements(
      user,
      requirements,
    );
    if (!satisfiesRequirements) {
      throwHttpErrorResponse(new ForbiddenErrorDto());
    }

    return true;
  }
}
