import {
  type ArgumentMetadata,
  ValidationPipe as BaseValidationPipe,
  type ValidationPipeOptions,
  type ValidationError as ValidatorError,
} from '@nestjs/common';
import { validatorOptions } from '../../validation/index.js';
import { ValidationErrorDto } from '../errors/errors.dto.js';
import { makeHttpException } from '../errors/index.js';

/**
 * Returns the given value without `undefined` properties, recursively.
 * Rather than deleting properties, objects holding `undefined` properties are replaced by copies with the same
 * prototype. In V8, deleting properties switches objects to a slower "dictionary mode". Other objects and arrays are
 * returned as is, although their children may be replaced in place.
 *
 * @param value The value from which `undefined` properties should be removed.
 * @returns The value without `undefined` properties.
 */
function withoutUndefinedProperties<T>(value: T): T {
  if (!value || typeof value !== 'object' || value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const stripped = withoutUndefinedProperties(item);
      if (stripped !== item) {
        value[index] = stripped;
      }
    });
    return value;
  }

  const object = value as Record<string, any>;
  let hasUndefinedProperties = false;
  Object.entries(object).forEach(([key, child]) => {
    if (child === undefined) {
      hasUndefinedProperties = true;
      return;
    }

    const stripped = withoutUndefinedProperties(child);
    if (stripped !== child) {
      object[key] = stripped;
    }
  });

  if (!hasUndefinedProperties) {
    return value;
  }

  const copy = Object.create(Object.getPrototypeOf(object));
  Object.entries(object).forEach(([key, child]) => {
    if (child !== undefined) {
      copy[key] = child;
    }
  });
  return copy;
}

/**
 * Custom validation pipe that throws a {@link ValidationError} when validation fails.
 * It also applies `class-transformer` transformations, and ensures that no `undefined` properties are present in the
 * output.
 */
export class ValidationPipe extends BaseValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      ...validatorOptions,
      transform: true,
      // This actually doesn't work with ES2022.
      // https://github.com/typestack/class-transformer/issues/1216
      // This is the reason why the `transform` method is overridden.
      transformOptions: { exposeUnsetFields: false },
      ...options,
      exceptionFactory: (errors) => {
        const flattenedErrors = errors
          .flatMap((error) => this.mapChildrenToValidationErrors(error))
          .filter((error) => !!error.constraints);

        const messages = flattenedErrors.flatMap((error) =>
          Object.values(error.constraints ?? {}).map(
            (c) => `${error.property}: ${c}`,
          ),
        );
        const fields = flattenedErrors.flatMap((error) => error.property);

        return makeHttpException(
          new ValidationErrorDto(
            messages.map((message) => `- ${message}`).join('\n'),
            fields,
          ),
        );
      },
    });
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    // Value is being copied/transformed by `class-transformer`, however in ES2022 `undefined` (optional) class
    // properties will still be present.
    const transformed = await super.transform(value, metadata);
    return withoutUndefinedProperties(transformed);
  }

  protected prependConstraintsWithParentProp(
    parentPath: string,
    error: ValidatorError,
  ): ValidatorError {
    return {
      ...error,
      constraints: error.constraints,
      property: `${parentPath}.${error.property}`,
    };
  }
}
