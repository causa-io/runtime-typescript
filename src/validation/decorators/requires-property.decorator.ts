import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Checks that the given property is defined when the decorated property is set in the object to validate.
 * The other property should be defined and not `null`.
 *
 * @param property The property that should be defined and not `null` when the decorated property exists.
 * @param options Additional validation options.
 */
export function RequiresProperty<P extends string>(
  property: P,
  options?: ValidationOptions,
) {
  return function RequiresPropertyDecorator(
    prototype: { [key in P]?: any },
    propertyName: string,
  ) {
    registerDecorator({
      name: 'requiresProperty',
      target: prototype.constructor,
      propertyName,
      constraints: [],
      options,
      validator: {
        defaultMessage() {
          return `'${propertyName}' requires '${property}' to be defined as well.`;
        },
        validate(_: unknown, { object }: ValidationArguments) {
          const requiredProperty = (object as any)[property] as unknown;

          return requiredProperty !== undefined && requiredProperty !== null;
        },
      },
    });
  };
}
