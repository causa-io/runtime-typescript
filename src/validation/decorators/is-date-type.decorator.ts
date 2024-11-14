import { Type } from 'class-transformer';
import { IsDate, type ValidationOptions } from 'class-validator';

/**
 * Transforms and validates the decorated property as a `Date` object.
 *
 * @param options Validation options.
 */
export function IsDateType(options: ValidationOptions = {}) {
  const isDateDecorator = IsDate(options);
  const typeDecorator = Type(() => Date);

  return function IsDateTypeDecorator<P extends string | symbol>(
    prototype: { [key in P]?: Date | Date[] | null },
    propertyName: P,
  ) {
    isDateDecorator(prototype, propertyName);
    typeDecorator(prototype, propertyName);
  };
}
