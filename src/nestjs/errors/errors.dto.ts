import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiConstantProperty } from '../openapi/index.js';
import { ErrorResponse, HttpError } from './http-error.js';

/**
 * The base class for all error DTOs, providing OpenAPI metadata.
 */
export abstract class ErrorDto implements ErrorResponse {
  @ApiProperty({ description: 'The HTTP status code of the error.' })
  @IsString()
  readonly statusCode!: HttpStatus;

  @ApiProperty({ description: 'A message describing the error.' })
  @IsString()
  readonly message!: string;

  @ApiProperty({ description: 'An error identifier, as a string.' })
  @IsString()
  readonly errorCode!: string;
}

/**
 * The response for a {@link NotFoundError}.
 */
export class NotFoundErrorDto extends ErrorDto {
  @ApiConstantProperty({ const: HttpStatus.NOT_FOUND })
  readonly statusCode = HttpStatus.NOT_FOUND;

  @ApiConstantProperty({ const: 'notFound' })
  readonly errorCode = 'notFound';

  constructor(
    readonly message: string = 'The requested resource was not found on the server.',
  ) {
    super();
  }
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
export class ConflictErrorDto extends ErrorDto {
  @ApiConstantProperty({ const: HttpStatus.CONFLICT })
  readonly statusCode = HttpStatus.CONFLICT;

  @ApiConstantProperty({ const: 'conflict' })
  readonly errorCode = 'conflict';

  constructor(
    readonly message: string = 'The request conflicts with existing resource(s) on the server.',
  ) {
    super();
  }
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
export class IncorrectVersionErrorDto extends ErrorDto {
  @ApiConstantProperty({ const: HttpStatus.CONFLICT })
  readonly statusCode = HttpStatus.CONFLICT;

  @ApiConstantProperty({ const: 'incorrectVersion' })
  readonly errorCode = 'incorrectVersion';

  constructor(
    readonly message: string = 'The provided version does not match the version of the resource on the server.',
  ) {
    super();
  }
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
export class InternalServerErrorDto extends ErrorDto {
  @ApiConstantProperty({ const: HttpStatus.INTERNAL_SERVER_ERROR })
  readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

  @ApiConstantProperty({ const: 'internalServerError' })
  readonly errorCode = 'internalServerError';

  constructor(
    readonly message: string = 'An unexpected error occurred on the server.',
  ) {
    super();
  }
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
export class BadRequestErrorDto extends ErrorDto {
  @ApiConstantProperty({ const: HttpStatus.BAD_REQUEST })
  readonly statusCode = HttpStatus.BAD_REQUEST;

  @ApiConstantProperty({ const: 'badRequest' })
  readonly errorCode = 'badRequest';

  constructor(readonly message: string = 'The request is invalid.') {
    super();
  }
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
export class ValidationErrorDto extends ErrorDto {
  @ApiConstantProperty({ const: HttpStatus.BAD_REQUEST })
  readonly statusCode = HttpStatus.BAD_REQUEST;

  @ApiConstantProperty({ const: 'invalidInput' })
  readonly errorCode = 'invalidInput';

  /**
   * Creates a new {@link ValidationErrorDto}.
   *
   * @param message A message returned to the client.
   * @param fields The list of fields in the request that failed validation.
   */
  constructor(readonly message: string, readonly fields: string[]) {
    super();
  }
}

/**
 * An error thrown when a request fails validation, mapped to a 400 HTTP error.
 */
export class ValidationError extends HttpError<ValidationErrorDto> {
  constructor(message: string, fields: string[]) {
    super(new ValidationErrorDto(message, fields));
  }
}

/**
 * The response for a {@link UnauthenticatedError}.
 */
export class UnauthenticatedErrorDto extends ErrorDto {
  @ApiConstantProperty({ const: HttpStatus.UNAUTHORIZED })
  readonly statusCode = HttpStatus.UNAUTHORIZED;

  @ApiConstantProperty({ const: 'unauthenticated' })
  readonly errorCode = 'unauthenticated';

  constructor(readonly message: string = 'The request must be authenticated.') {
    super();
  }
}

/**
 * An error mapped to a generic 401 HTTP error.
 * "Unauthenticated" is closer to the true meaning of the error: no authentication mechanism was provided with the
 * request.
 */
export class UnauthenticatedError extends HttpError<UnauthenticatedErrorDto> {
  constructor() {
    super(new UnauthenticatedErrorDto());
  }
}

/**
 * The response for a {@link ForbiddenError}.
 */
export class ForbiddenErrorDto extends ErrorDto {
  @ApiConstantProperty({ const: HttpStatus.FORBIDDEN })
  readonly statusCode = HttpStatus.FORBIDDEN;

  @ApiConstantProperty({ const: 'forbidden' })
  readonly errorCode = 'forbidden';

  constructor(readonly message: string = 'The request is not allowed.') {
    super();
  }
}

/**
 * An error mapped to a generic 403 HTTP error.
 */
export class ForbiddenError extends HttpError<ForbiddenErrorDto> {
  constructor() {
    super(new ForbiddenErrorDto());
  }
}
