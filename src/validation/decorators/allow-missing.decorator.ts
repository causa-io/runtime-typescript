import { ValidateIf, type ValidationOptions } from 'class-validator';

/**
 * Skips validation if the decorated property is `undefined`.
 *
 * @param options Additional validation options.
 */
export function AllowMissing(options?: ValidationOptions): PropertyDecorator {
  return function AllowMissingDecorator(
    prototype: object,
    propertyKey: string | symbol,
  ) {
    ValidateIf((obj) => obj[propertyKey] !== undefined, options)(
      prototype,
      propertyKey,
    );
  };
}
