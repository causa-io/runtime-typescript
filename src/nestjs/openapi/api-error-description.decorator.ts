import { ErrorDto } from '@causa/runtime/nestjs';
import { Type } from '@nestjs/common';

/**
 * The metadata key used to store the API error description.
 */
const API_ERROR_DESCRIPTION_KEY = 'apiErrorDescription';

/**
 * Decorates an {@link ErrorDto} with a description of why the error occurs.
 * This is needed by the `ApiErrorResponses` decorator to generate the OpenAPI documentation.
 *
 * @param description The description of why the error occurs.
 */
export function ApiErrorDescription(description: string) {
  return (target: { new (...args: any[]): ErrorDto }) => {
    Reflect.defineMetadata(API_ERROR_DESCRIPTION_KEY, description, target);
  };
}

/**
 * Retrieves the description of an {@link ErrorDto} decorated with {@link ApiErrorDescription}.
 *
 * @param type The type of the error DTO.
 * @returns The description of the error DTO.
 */
export function getApiErrorDescription(type: Type): string {
  const description = Reflect.getMetadata(API_ERROR_DESCRIPTION_KEY, type);
  if (description === undefined) {
    throw new Error(`No API error description found for '${type.name}'.`);
  }

  return description;
}
