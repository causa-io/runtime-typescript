/**
 * An error that indicates that the processing or request should be retried in the future.
 *
 * Optionally, a delay can be specified to indicate that retrying should only occur after a given duration.
 * This delay may or may not be respected, depending on the context.
 */
export class RetryableError extends Error {
  /**
   * Creates a new retryable error.
   *
   * @param message The error message.
   * @param delay The delay, in milliseconds, that should be waited before retrying.
   */
  constructor(message: string, readonly delay?: number) {
    super(message);
  }
}
