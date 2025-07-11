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

export function makeHttpError(response: ErrorResponse): HttpException {
  return new HttpException(response, response.statusCode);
}

export function throwHttpErrorResponse(response: ErrorResponse): never {
  throw makeHttpError(response);
}
