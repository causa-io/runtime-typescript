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
 * An error that will be converted to an HTTP response sent to the client.
 * This should be subclassed by all errors that should be returned to the client.
 */
export class HttpError<T extends ErrorResponse> extends HttpException {
  /**
   * Creates a new {@link HttpError}.
   *
   * @param response The response to send to the client.
   */
  constructor(response: T) {
    super(response, response.statusCode);
  }
}
