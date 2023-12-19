import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ValidationError as ClassValidationError,
  ValidatorOptions,
  validate,
} from 'class-validator';
import 'reflect-metadata';
import { validatorOptions } from './configuration.js';
import { ValidationError } from './errors.js';

/**
 * Flattens all the validation error messages contained in the given errors and their children.
 *
 * @param errors The errors returned by `class-validator`'s {@link validate}.
 * @returns The error messages.
 */
function getErrorMessages(errors: ClassValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...getErrorMessages(error.children ?? []),
  ]);
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
    const validationMessages = getErrorMessages(errors);
    throw new ValidationError(validationMessages);
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
