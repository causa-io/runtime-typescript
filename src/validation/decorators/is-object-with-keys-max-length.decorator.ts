import {
  isObject,
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

/**
 * Checks that the given value is an object with keys that do not exceed the given length.
 *
 * @param value The value being checked.
 * @param maxLength The maximum length for the object's keys.
 * @returns `true` if the value is an object with keys that do not exceed the given length.
 */
export function isObjectWithKeysMaxLength(
  value: unknown,
  maxLength: number,
): value is Record<any, any> {
  return (
    isObject(value) &&
    Object.keys(value).every((key) => key.length <= maxLength)
  );
}

/**
 * Checks that the decorated object's keys do not exceed the given length.
 *
 * @param maxLength The maximum length for the object's keys.
 * @param options Validation options.
 */
export function IsObjectWithKeysMaxLength(
  maxLength: number,
  options?: ValidationOptions,
) {
  return function IsMapWithKeysMaxLengthDecorator<P extends string>(
    prototype: { [key in P]?: Record<string, any> | null },
    propertyName: P,
  ) {
    registerDecorator({
      name: 'isObjectWithKeysMaxLength',
      target: prototype.constructor,
      propertyName,
      constraints: [],
      options,
      validator: {
        defaultMessage() {
          return `'${propertyName}' should be an object with keys that are no longer than ${maxLength} characters.`;
        },
        validate(value: unknown) {
          return isObjectWithKeysMaxLength(value, maxLength);
        },
      },
    });
  };
}
