/**
 * An authenticated user, possibly with claims.
 */
export type User = {
  /**
   * The ID of the user.
   */
  id: string;

  // Claims retrieved from the JWT.
  [claim: string]: any;
};
