import { Type } from 'class-transformer';
import { IsDefined, ValidateNested, ValidatorOptions } from 'class-validator';
import { AllowMissing } from './allow-missing.decorator.js';

/**
 * Transforms and validates a nested object, or object array.
 * The property can also be made optional using `allowMissing`.
 *
 * @param nestedType The type of the nested object, or object array.
 * @param options Validation options.
 */
export function ValidateNestedType<T>(
  nestedType: () => { new (): T },
  options: ValidatorOptions & {
    /**
     * If `true`, the property can be missing in the input object.
     * Defaults to `false`.
     */
    allowMissing?: boolean;
  } = {},
) {
  const { allowMissing, ...validatorOptions } = {
    allowMissing: false,
    ...options,
  };

  const typeDecorator = Type(nestedType);
  const validatedNestedDecorator = ValidateNested(validatorOptions);
  // `AllowMissing` is actually not needed here. By default, `class-validator` would ignore the property.
  // It is however required to apply the `IsDefined` decorator when the property is not optional.
  const definedDecorator = allowMissing
    ? AllowMissing(validatorOptions)
    : IsDefined(validatorOptions);

  return function ValidateNestedTypeDecorator<P extends string | symbol>(
    target: { [key in P]?: T | T[] },
    propertyKey: P,
  ) {
    typeDecorator(target, propertyKey);
    validatedNestedDecorator(target, propertyKey);
    definedDecorator(target, propertyKey);
  };
}
