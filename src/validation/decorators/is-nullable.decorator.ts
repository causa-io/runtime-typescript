import { ValidateIf, type ValidationOptions } from 'class-validator';

/**
 * Skips validation if the property is `null`.
 */
export function IsNullable(options?: ValidationOptions): PropertyDecorator {
  return function IsNullableDecorator(
    prototype: object,
    propertyKey: string | symbol,
  ) {
    ValidateIf((obj) => obj[propertyKey] !== null, options)(
      prototype,
      propertyKey,
    );
  };
}
