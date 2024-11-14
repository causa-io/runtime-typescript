import { HttpStatus, type Type } from '@nestjs/common';
import { ErrorDto } from '../errors/index.js';
import { ApiConstantProperty } from './api-constant-property.decorator.js';

/**
 * The metadata key used to store the API error status code.
 */
const API_ERROR_STATUS_CODE_KEY = 'apiErrorStatusCode';

/**
 * Decorates the `statusCode` property of an {@link ErrorDto} with the given status code.
 * This is needed by the `ApiErrorResponses` decorator to generate the OpenAPI documentation.
 * This decorator also adds the {@link ApiConstantProperty} decorator to the property.
 *
 * @param code The status code for the property.
 */
export function ApiErrorStatusCode<T extends HttpStatus>(code: T) {
  const apiConstantProperty = ApiConstantProperty({ const: code });

  return (target: ErrorDto & { statusCode: T }, propertyKey: 'statusCode') => {
    Reflect.defineMetadata(API_ERROR_STATUS_CODE_KEY, code, target.constructor);
    apiConstantProperty(target, propertyKey);
  };
}

/**
 * Retrieves the {@link ErrorDto.statusCode} of a property decorated with {@link ApiErrorStatusCode}.
 *
 * @param type The type of the error DTO.
 * @returns The status code of the error DTO.
 */
export function getApiErrorStatusCode(type: Type): number {
  const statusCode = Reflect.getMetadata(API_ERROR_STATUS_CODE_KEY, type);
  if (statusCode === undefined) {
    throw new Error(`No API error status code found for '${type.name}'.`);
  }

  return statusCode;
}
