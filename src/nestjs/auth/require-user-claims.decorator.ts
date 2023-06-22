import { SetMetadata } from '@nestjs/common';
import { UserClaimRequirements } from '../../auth/index.js';

/**
 * The metadata key for the {@link RequireUserClaims} decorator.
 */
export const USER_CLAIM_REQUIREMENTS_KEY = 'userClaims';

/**
 * Ensures the decorated routes are only called by an authenticated user that satisfies the given claim requirements.
 *
 * @param requirements The requirements the user should satisfy.
 */
export const RequireUserClaims = (requirements: UserClaimRequirements) =>
  SetMetadata(USER_CLAIM_REQUIREMENTS_KEY, requirements);
