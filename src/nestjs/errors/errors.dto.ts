import { HttpStatus } from '@nestjs/common';
import { ErrorResponse, HttpError } from './http-error.js';

/**
 * The response for a {@link NotFoundError}.
 */
export class NotFoundErrorDto implements ErrorResponse {
  readonly statusCode = HttpStatus.NOT_FOUND;

  readonly errorCode = 'notFound';

  constructor(
    readonly message: string = 'The requested resource was not found on the server.',
  ) {}
}

/**
 * An error mapped to a generic 404 HTTP error.
 */
export class NotFoundError extends HttpError<NotFoundErrorDto> {
  constructor(message?: string) {
    super(new NotFoundErrorDto(message));
  }
}

/**
 * The response for a {@link ConflictError}.
 */
export class ConflictErrorDto implements ErrorResponse {
  readonly statusCode = HttpStatus.CONFLICT;
  readonly errorCode = 'conflict';

  constructor(
    readonly message: string = 'The request conflicts with existing resource(s) on the server.',
  ) {}
}

/**
 * An error mapped to a generic 409 HTTP error.
 */
export class ConflictError extends HttpError<ConflictErrorDto> {
  constructor(message?: string) {
    super(new ConflictErrorDto(message));
  }
}

/**
 * The response for a {@link IncorrectVersionError}.
 */
export class IncorrectVersionErrorDto implements ErrorResponse {
  readonly statusCode = HttpStatus.CONFLICT;
  readonly errorCode = 'incorrectVersion';

  constructor(
    readonly message: string = 'The provided version does not match the version of the resource on the server.',
  ) {}
}

/**
 * An error mapped to a 409 HTTP error, thrown when the client does not provide the correct version of the resource to
 * modify.
 */
export class IncorrectVersionError extends HttpError<IncorrectVersionErrorDto> {
  constructor(message?: string) {
    super(new IncorrectVersionErrorDto(message));
  }
}

/**
 * The response for a {@link InternalServerError}.
 */
export class InternalServerErrorDto implements ErrorResponse {
  readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  readonly errorCode = 'internalServerError';

  constructor(
    readonly message: string = 'An unexpected error occurred on the server.',
  ) {}
}

/**
 * An error mapped to a generic 500 HTTP error.
 */
export class InternalServerError extends HttpError<InternalServerErrorDto> {
  constructor(message?: string) {
    super(new InternalServerErrorDto(message));
  }
}

/**
 * The response for a {@link BadRequestError}.
 */
export class BadRequestErrorDto implements ErrorResponse {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = 'badRequest';

  constructor(readonly message: string = 'The request is invalid.') {}
}

/**
 * An error mapped to a generic 400 HTTP error.
 */
export class BadRequestError extends HttpError<BadRequestErrorDto> {
  constructor(message?: string) {
    super(new BadRequestErrorDto(message));
  }
}

/**
 * The response for a {@link ValidationError}.
 */
export class ValidationErrorDto implements ErrorResponse {
  readonly statusCode = HttpStatus.BAD_REQUEST;
  readonly errorCode = 'invalidInput';

  /**
   * Creates a new {@link ValidationErrorDto}.
   *
   * @param message A message returned to the client.
   * @param fields The list of fields in the request that failed validation.
   */
  constructor(readonly message: string, readonly fields: string[]) {}
}

/**
 * An error thrown when a request fails validation, mapped to a 400 HTTP error.
 */
export class ValidationError extends HttpError<ValidationErrorDto> {
  constructor(message: string, fields: string[]) {
    super(new ValidationErrorDto(message, fields));
  }
}
