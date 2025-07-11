import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiConstantProperty } from '../openapi/index.js';
import type { ErrorResponse } from './http-error.js';

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
  constructor(
    readonly message: string,
    readonly fields: string[],
  ) {
    super();
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
 * The response for a {@link ServiceUnavailableError}.
 */
export class ServiceUnavailableErrorDto extends ErrorDto {
  @ApiConstantProperty({ const: HttpStatus.SERVICE_UNAVAILABLE })
  readonly statusCode = HttpStatus.SERVICE_UNAVAILABLE;

  @ApiConstantProperty({ const: 'serviceUnavailable' })
  readonly errorCode = 'serviceUnavailable';

  constructor(
    readonly message: string = 'The server is currently unable to handle the request.',
  ) {
    super();
  }
}
