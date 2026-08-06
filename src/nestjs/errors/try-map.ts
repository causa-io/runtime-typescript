import type { Type } from '@nestjs/common';
import {
  ForbiddenError,
  IncorrectEntityVersionError,
  type ErrorCase,
} from '../../errors/index.js';
import { ValidationError } from '../../validation/index.js';
import {
  ForbiddenErrorDto,
  IncorrectVersionErrorDto,
  ValidationErrorDto,
  type ErrorDto,
} from './errors.dto.js';
import { makeHttpException } from './http-error.js';

/**
 * Returns an {@link ErrorCase} that maps an error type to an {@link ErrorDto}.
 *
 * @param type The type of the error to match.
 * @param throwFn The function that takes the error and returns the {@link ErrorDto} to throw.
 * @returns The {@link ErrorCase}.
 */
export function toDto<E>(
  type: Type<E>,
  throwFn: (e: E) => ErrorDto,
): ErrorCase<never, E> {
  return { type, throw: (e) => makeHttpException(throwFn(e)) };
}

/**
 * Returns an {@link ErrorCase} that maps an error type to an {@link ErrorDto} type.
 *
 * @param type The type of the error to match.
 * @param dtoType The type of the {@link ErrorDto} to instantiate and throw.
 * @returns The {@link ErrorCase}.
 */
export function toDtoType<E>(
  type: Type<E>,
  dtoType: Type<ErrorDto>,
): ErrorCase<never, E> {
  return {
    type,
    throw: () => makeHttpException(new dtoType()),
  };
}

/**
 * Maps an {@link IncorrectEntityVersionError} to an {@link IncorrectVersionErrorDto}.
 */
export const incorrectEntityVersionErrorAsDto = toDtoType(
  IncorrectEntityVersionError,
  IncorrectVersionErrorDto,
);

/**
 * Maps a {@link ForbiddenError} to a {@link ForbiddenErrorDto}.
 * The message of the error is not returned to the caller.
 */
export const forbiddenErrorAsDto = toDtoType(ForbiddenError, ForbiddenErrorDto);

/**
 * Returns an {@link ErrorCase} that maps a {@link ValidationError} to a {@link ValidationErrorDto}.
 * The {@link ValidationError.validationMessages} are formatted as a bullet list.
 *
 * @param type The type of the error to match, which can be narrower than the base {@link ValidationError}.
 *   Defaults to the {@link ValidationError} itself.
 * @returns The {@link ErrorCase}.
 */
export function validationErrorAsDto(
  type: Type<ValidationError> = ValidationError,
): ErrorCase<never, ValidationError> {
  return toDto(
    type,
    (error) =>
      new ValidationErrorDto(
        error.validationMessages.map((message) => `- ${message}`).join('\n'),
        error.fields,
      ),
  );
}
