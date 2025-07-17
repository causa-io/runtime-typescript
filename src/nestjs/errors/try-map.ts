import type { Type } from '@nestjs/common';
import type { ErrorCase } from '../../errors/index.js';
import type { ErrorDto } from './errors.dto.js';
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
