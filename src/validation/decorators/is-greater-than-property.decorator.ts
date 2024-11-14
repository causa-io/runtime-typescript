import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/**
 * Options for {@link IsGreaterThanProperty}.
 */
type IsGreaterThanPropertyOptions = ValidationOptions & {
  /**
   * If `false`, the property will pass validation when the other referenced property is undefined or null.
   * Defaults to `true`.
   */
  requireOtherProperty?: boolean;
};

/**
 * Checks if the value is greater than the other value.
 *
 * @param value The value to check.
 * @param otherValue The other value to compare to.
 * @param options Options for the validation.
 * @returns `true` if the value is greater than the other value, `false` otherwise.
 */
export function isGreaterThanValue(
  value: unknown,
  otherValue: unknown,
  options: IsGreaterThanPropertyOptions,
): boolean {
  const requireOtherProperty = options.requireOtherProperty ?? true;

  const isOtherValueDefined = otherValue !== undefined && otherValue !== null;
  if (!isOtherValueDefined) {
    return !requireOtherProperty;
  }

  return (value as any) > (otherValue as any);
}

/**
 * Checks that the decorated property is greater than the referenced property.
 *
 * @param property The name of other property, which should be less than the decorated property.
 * @param options Validation options.
 */
export function IsGreaterThanProperty<P extends string>(
  property: P,
  options: IsGreaterThanPropertyOptions = {},
) {
  return function IsGreaterThanPropertyDecorator(
    prototype: { [key in P]?: any },
    propertyName: string,
  ) {
    registerDecorator({
      name: 'isGreaterThanProperty',
      target: prototype.constructor,
      propertyName,
      constraints: [],
      options,
      validator: {
        defaultMessage() {
          return `'${propertyName}' should be greater than '${property}'.`;
        },
        validate(value: unknown, { object }: ValidationArguments) {
          const otherValue = (object as any)[property] as unknown;
          return isGreaterThanValue(value, otherValue, options);
        },
      },
    });
  };
}
