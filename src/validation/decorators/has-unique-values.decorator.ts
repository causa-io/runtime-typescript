import {
  ValidationOptions,
  isArray,
  isObject,
  registerDecorator,
} from 'class-validator';

/**
 * Checks if an array or object has unique values.
 *
 * @param value The array or object to check.
 * @returns `true` if the array or object has unique values, `false` otherwise.
 */
export function hasUniqueValues(value: unknown): value is any[] | object {
  if (isArray(value)) {
    return value.length === new Set(value).size;
  }

  if (isObject(value)) {
    const values = Object.values(value);
    return values.length === new Set(values).size;
  }

  return false;
}

/**
 * Checks that an array or object has unique values.
 * Uniqueness is checked by creating a {@link Set}.
 *
 * @param options Additional validation options.
 */
export function HasUniqueValues(options?: ValidationOptions) {
  return function HasUniqueValuesDecorator<P extends string>(
    prototype: { [key in P]?: any[] | object },
    propertyName: P,
  ) {
    registerDecorator({
      name: 'hasUniqueValues',
      target: prototype.constructor,
      propertyName,
      constraints: [],
      options,
      validator: {
        defaultMessage() {
          return `'${propertyName}' should contain unique values.`;
        },
        validate(value: unknown) {
          return hasUniqueValues(value);
        },
      },
    });
  };
}
