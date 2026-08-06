/**
 * Thrown when one or several errors occur during the validation of an object.
 */
export class ValidationError extends Error {
  /**
   * Creates a new {@link ValidationError}.
   *
   * @param validationMessages The messages describing why the validation failed.
   * @param fields The paths to the properties that failed validation, e.g. `items.0.name`.
   *   This is usually expected to be deduplicated. It is empty when the validation failed for the payload as a whole.
   */
  constructor(
    readonly validationMessages: string[],
    readonly fields: string[] = [],
  ) {
    super('One or more errors occurred during the validation of the object.');
  }
}
