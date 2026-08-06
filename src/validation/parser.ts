import type { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ValidationError as ClassValidationError,
  type ValidatorOptions,
  validate,
} from 'class-validator';
import 'reflect-metadata';
import { validatorOptions } from './configuration.js';
import { ValidationError } from './errors.js';

/**
 * A single validation failure, referencing the path to the property that failed validation.
 */
type ValidationFailure = {
  /**
   * The path to the property that failed validation, e.g. `items.0.name`.
   * This is an empty string when the failure applies to the validated payload as a whole.
   */
  field: string;

  /**
   * The message describing why the validation failed.
   */
  message: string;
};

/**
 * Flattens all the validation failures contained in the given errors and their children.
 *
 * @param errors The errors returned by `class-validator`'s {@link validate}.
 * @param parentPath The path to the property holding the given errors, if any.
 * @returns The validation failures.
 */
function getFailures(
  errors: ClassValidationError[],
  parentPath = '',
): ValidationFailure[] {
  return errors.flatMap((error) => {
    // Although it is not typed as such, `property` is `undefined` for the error returned when `forbidUnknownValues` is
    // enabled and the validated object has no metadata at all.
    const property = error.property ?? '';
    const field = parentPath ? `${parentPath}.${property}` : property;

    return [
      ...Object.values(error.constraints ?? {}).map((message) => ({
        field,
        message,
      })),
      ...getFailures(error.children ?? [], field),
    ];
  });
}

/**
 * Validates the given object.
 * Throws a {@link ValidationError} if the validation fails.
 *
 * @param obj The object to validate.
 * @param options {@link ValidatorOptions} to use when validating the object.
 *   The {@link validatorOptions} are inherited.
 */
export async function validateObject(
  obj: object,
  options: ValidatorOptions = {},
): Promise<void> {
  if (typeof obj !== 'object' || obj === null) {
    throw new ValidationError(['input must be an object']);
  }

  const errors = await validate(obj, { ...validatorOptions, ...options });

  if (errors.length > 0) {
    const failures = getFailures(errors);
    throw new ValidationError(
      failures.map(({ message }) => message),
      [...new Set(failures.map(({ field }) => field).filter((f) => f))],
    );
  }
}

/**
 * Transforms and validates the input payload into the given type.
 *
 * @param type The type of object to parse.
 * @param payload The input payload to parse.
 * @param options {@link ValidatorOptions} to use when validating the object.
 *   The {@link validatorOptions} are inherited.
 * @returns The parsed object.
 */
export async function parseObject<T extends object>(
  type: Type<T>,
  payload: unknown,
  options: ValidatorOptions = {},
): Promise<T> {
  const instance = plainToInstance(type, payload);

  // This can occur because `plainToInstance` handles some special cases, like the input being a `string`, `Date` or
  // `Buffer`. This is not the desired behavior here.
  if (instance.constructor !== type) {
    throw new ValidationError(['payload must be a plain object']);
  }

  await validateObject(instance, options);

  return instance;
}
