import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * An interface that all error responses should implement.
 */
export type ErrorResponse = {
  /**
   * The HTTP status code of the error.
   */
  readonly statusCode: HttpStatus;

  /**
   * A message describing the error.
   */
  readonly message: string;

  /**
   * An error identifier, as a string.
   */
  readonly errorCode: string;
};

/**
 * Creates an {@link HttpException} from the provided {@link ErrorResponse}.
 *
 * @param response The {@link ErrorResponse} that will be used as the body of the response.
 * @returns The {@link HttpException}.
 */
export function makeHttpException(response: ErrorResponse): HttpException {
  return new HttpException(response, response.statusCode);
}

/**
 * Throws an {@link HttpException} with the provided {@link ErrorResponse} as its body.
 * The global exception filter will catch this and convert it to an HTTP response.
 *
 * @param response The {@link ErrorResponse} that will be used as the body of the response.
 */
export function throwHttpErrorResponse(response: ErrorResponse): never {
  throw makeHttpException(response);
}
