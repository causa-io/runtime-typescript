/**
 * Thrown when one or several errors occur during the validation of an object.
 */
export class ValidationError extends Error {
  /**
   * Creates a new {@link ValidationError}.
   *
   * @param validationMessages The messages describing why the validation failed.
   */
  constructor(readonly validationMessages: string[]) {
    super('One or more errors occurred during the validation of the object.');
  }
}
