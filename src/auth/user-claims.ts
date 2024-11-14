import { InvalidClaimRequirementsError } from './errors.js';
import type { User } from './user.js';

/**
 * A valid type for a user claim value.
 */
type UserClaimValue = string | number | boolean;

/**
 * The requirements that will be checked against a {@link User}'s claims.
 */
export type UserClaimRequirements = {
  [claim: string]:
    | UserClaimValue
    | {
        /**
         * When set, the claim is assumed to be an array that should contain at least one of the specified values.
         */
        containsAny: UserClaimValue[];
      };
};

/**
 * Checks if a {@link User} satisfies the given {@link UserClaimRequirements}.
 *
 * @param user The {@link User} for which requirements should be checked.
 * @param requirements A dictionary of requirements to check.
 * @returns `true` if the user satisfies the requirements, `false` otherwise.
 */
export function doesUserSatisfyClaimRequirements(
  user: User,
  requirements: UserClaimRequirements,
): boolean {
  const hasFailedRequirement = Object.entries(requirements).some(
    ([claim, expectedValue]): boolean => {
      if (expectedValue === undefined || expectedValue === null) {
        throw new InvalidClaimRequirementsError(
          requirements,
          `Invalid claim requirement for claim '${claim}'.`,
        );
      }

      const actualValue = user[claim];

      if (typeof expectedValue === 'object') {
        if (expectedValue.containsAny) {
          if (!Array.isArray(expectedValue.containsAny)) {
            throw new InvalidClaimRequirementsError(
              requirements,
              `Invalid 'containsAny' value for claim requirement '${claim}'.`,
            );
          }

          if (!Array.isArray(actualValue)) {
            return true;
          }

          const containsAtLeastOne = actualValue.some((elt) =>
            expectedValue.containsAny.includes(elt),
          );
          return !containsAtLeastOne;
        }

        throw new InvalidClaimRequirementsError(
          requirements,
          `Invalid claim requirement for claim '${claim}'.`,
        );
      }

      return expectedValue !== actualValue;
    },
  );

  return !hasFailedRequirement;
}
