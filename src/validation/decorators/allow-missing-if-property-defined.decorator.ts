import { ValidateIf, ValidationOptions } from 'class-validator';

/**
 * Allows the decorated property to be missing only if another property of the object is defined.
 *
 * @param property The other property of the object.
 * @param options Additional validation options.
 */
export function AllowMissingIfPropertyDefined<P extends string>(
  property: P,
  options?: ValidationOptions,
): PropertyDecorator {
  return function AllowMissingIfPropertyDefinedDecorator(
    prototype: { [key in P]?: any },
    propertyName: string | symbol,
  ) {
    ValidateIf(
      (obj) =>
        !(obj[property] !== undefined && obj[propertyName] === undefined),
      options,
    )(prototype, propertyName);
  };
}
