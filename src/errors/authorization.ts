/**
 * An error thrown when an operation is not allowed in the current context, e.g. for the authenticated user.
 * Although it usually translates to a "forbidden" HTTP response, this error is not tied to HTTP, such that it can be
 * thrown by authorization logic running in any context.
 */
export class ForbiddenError extends Error {
  /**
   * Creates a new {@link ForbiddenError}.
   *
   * @param message The error message.
   * @param options Additional options for the error.
   */
  constructor(
    message: string = 'The operation is not allowed.',
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
