import {
  ValidationPipe as BaseValidationPipe,
  ValidationPipeOptions,
  ValidationError as ValidatorError,
} from '@nestjs/common';
import { validatorOptions } from '../../validation/index.js';
import { ValidationError } from '../errors/index.js';

/**
 * Custom validation pipe that throws a {@link ValidationError} when validation fails.
 * It also applies `class-transformer` transformations.
 */
export class ValidationPipe extends BaseValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({ ...validatorOptions, transform: true, ...options });

    this.exceptionFactory = (errors) => {
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
    };
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
