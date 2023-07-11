import {
  isArray,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Checks if the intersection between two arrays is empty.
 *
 * @param array The array to check.
 * @param otherArray Another array, which could be `undefined`.
 * @returns `true` if the intersection between the two arrays is empty, `false` otherwise.
 */
export function hasEmptyIntersectionWith(
  array: unknown,
  otherArray: unknown,
): array is any[] {
  if (!isArray(array)) {
    return false;
  }

  if (!otherArray) {
    return true;
  }

  if (!isArray(otherArray)) {
    return false;
  }

  const hasCommonElements = array.some((element) =>
    otherArray.includes(element),
  );
  return !hasCommonElements;
}

/**
 * Checks that the intersection between two arrays is empty.
 *
 * @param property The other array property that should not intersect with the decorated property.
 * @param options Additional validation options.
 */
export function HasEmptyIntersectionWith<P2 extends string>(
  property: P2,
  options?: ValidationOptions,
) {
  return function HasEmptyIntersectionWithDecorator<P1 extends string>(
    prototype: { [key in P1 | P2]?: any[] | null },
    propertyName: P1,
  ) {
    registerDecorator({
      name: 'hasEmptyIntersectionWith',
      target: prototype.constructor,
      propertyName,
      constraints: [],
      options,
      validator: {
        defaultMessage() {
          return `'${propertyName}' should not have any elements in common with '${property}'.`;
        },
        validate(value: unknown, { object }: ValidationArguments) {
          const otherArray = (object as any)[property] as unknown;
          return hasEmptyIntersectionWith(value, otherArray);
        },
      },
    });
  };
}
