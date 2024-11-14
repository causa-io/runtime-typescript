import {
  type ArgumentMetadata,
  ValidationPipe as BaseValidationPipe,
  type ValidationPipeOptions,
  type ValidationError as ValidatorError,
} from '@nestjs/common';
import { validatorOptions } from '../../validation/index.js';
import { ValidationError } from '../errors/index.js';

/**
 * Removes all `undefined` properties from the given object recursively.
 *
 * @param object The object to remove `undefined` properties from.
 */
function removeUndefinedPropertiesRecursively(object: any): void {
  if (!object || typeof object !== 'object' || object instanceof Date) {
    return;
  }

  if (Array.isArray(object)) {
    object.forEach(removeUndefinedPropertiesRecursively);
    return;
  }

  Object.entries(object).forEach(([key, value]) => {
    if (value === undefined) {
      delete object[key];
      return;
    }

    removeUndefinedPropertiesRecursively(value);
  });
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

        return new ValidationError(
          messages.map((message) => `- ${message}`).join('\n'),
          fields,
        );
      },
    });
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    // Value is being copied/transformed by `class-transformer`, however in ES2022 `undefined` (optional) class
    // properties will still be present.
    const transformed = await super.transform(value, metadata);
    // Removing the `undefined` properties without copying the object because `class-transformer` already did that.
    removeUndefinedPropertiesRecursively(transformed);
    return transformed;
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
