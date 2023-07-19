import {
  isObject,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Checks that the given value is an object with values satisfying the given predicate.
 *
 * @param value The value to check.
 * @param predicate The predicate that each value must satisfy.
 * @returns `true` if the value is an object with values satisfying the predicate, `false` otherwise.
 */
export function isObjectWithValuesSatisfying(
  value: unknown,
  predicate: (value: unknown) => boolean,
): value is Record<any, any> {
  return isObject(value) && Object.values(value).every(predicate);
}

/**
 * Checks that the decorated object's values satisfy the given predicate.
 *
 * @param predicate The predicate that each value must satisfy.
 * @param options Validation options.
 */
export function IsObjectWithValuesSatisfying(
  predicate: (value: unknown) => boolean,
  options?: ValidationOptions,
) {
  return function IsObjectWithValuesSatisfyingDecorator<P extends string>(
    prototype: { [key in P]?: Record<string, any> | null },
    propertyName: P,
  ) {
    registerDecorator({
      name: 'isObjectWithValuesSatisfying',
      target: prototype.constructor,
      propertyName,
      constraints: [],
      options,
      validator: {
        defaultMessage() {
          return `'${propertyName}' should be an object with values satisfying the predicate.`;
        },
        validate(value: unknown) {
          return isObjectWithValuesSatisfying(value, predicate);
        },
      },
    });
  };
}
