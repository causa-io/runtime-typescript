import type { Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, refs } from '@nestjs/swagger';
import { ErrorDto } from '../index.js';
import { getApiErrorDescription } from './api-error-description.decorator.js';
import { getApiErrorStatusCode } from './api-error-status-code.decorator.js';

/**
 * Decorates a controller method or class with the given error DTOs.
 * This documents the endpoint(s) to indicate that they can return those DTOs in the OpenAPI specification.
 *
 * A current limitation is that errors set a the class level will be overridden by errors set at the method level _for
 * the same status code_.
 *
 * @param dtos The error DTOs that can be returned by the endpoint.
 */
export function ApiErrorResponses(
  ...dtos: { new (...args: any[]): ErrorDto }[]
): MethodDecorator & ClassDecorator {
  const errorsByStatus = dtos.reduce(
    (responses, type) => {
      const statusCode = getApiErrorStatusCode(type);
      const description = getApiErrorDescription(type);

      responses[statusCode] = [
        ...(responses[statusCode] || []),
        { description, type },
      ];
      return responses;
    },
    {} as Record<number, { description: string; type: Type }[]>,
  );

  return (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    ApiExtraModels(...dtos)(target, propertyKey, descriptor);

    Object.entries(errorsByStatus).forEach(([status, errors]) => {
      const description =
        errors.length > 1
          ? errors.map((e) => `- ${e.description}`).join('\n')
          : errors[0].description;

      ApiResponse({
        status: parseInt(status),
        description,
        schema: { oneOf: refs(...errors.map((e) => e.type)) },
      })(target, propertyKey as any, descriptor as any);
    });
  };
}
