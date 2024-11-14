import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/**
 * Checks that another specified property is not defined when the decorated property is set in the object to validate.
 * For the other property, even a `null` value is considered as defined.
 *
 * @param property The property that should not be defined when the decorated property exists.
 * @param options Additional validation options.
 */
export function RequiresPropertyNotToBeDefined<P extends string>(
  property: P,
  options?: ValidationOptions,
) {
  return function RequiresPropertyNotToBeDefinedDecorator(
    prototype: { [key in P]?: any },
    propertyName: string,
  ) {
    registerDecorator({
      name: 'requiresPropertyNotToBeDefined',
      target: prototype.constructor,
      propertyName,
      constraints: [],
      options,
      validator: {
        defaultMessage() {
          return `'${property}' should not be defined when '${propertyName}' is present.`;
        },
        validate(_: unknown, { object }: ValidationArguments) {
          return (object as any)[property] === undefined;
        },
      },
    });
  };
}
