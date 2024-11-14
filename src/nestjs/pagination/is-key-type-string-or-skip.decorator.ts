import {
  isString,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import { CUSTOM_READ_AFTER_METADATA_KEY } from './custom-read-after-type.decorator.js';

/**
 * Validates the `readAfter` value when the key type is the default one (`string`).
 * If the `PaginationKeyType` decorator has been used, the validation is skipped.
 *
 * @param validationOptions Base validation options.
 */
export function IsKeyTypeStringOrSkip(validationOptions?: ValidationOptions) {
  return function (target: any, propertyName: 'readAfter') {
    registerDecorator({
      name: 'isStringIfTypeMatch',
      target: target.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const hasObjectKeyMetadata = Reflect.hasMetadata(
            CUSTOM_READ_AFTER_METADATA_KEY,
            args.object.constructor,
          );

          return hasObjectKeyMetadata || isString(value);
        },
      },
    });
  };
}
