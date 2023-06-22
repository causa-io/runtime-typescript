import { UserClaimRequirements } from './user-claims.js';

/**
 * An error thrown when the expression of user claim requirements are invalid.
 * This is a developer error.
 */
export class InvalidClaimRequirementsError extends Error {
  constructor(
    readonly requirements: UserClaimRequirements,
    message = 'Invalid user claim requirements.',
  ) {
    super(message);
  }
}
