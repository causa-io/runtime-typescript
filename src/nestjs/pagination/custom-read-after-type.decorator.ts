import { plainToInstance, Transform } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ValidationError } from '../errors/index.js';
import { PageQuery } from './query.js';

/**
 * Flag to detect that the {@link PageQuery.readAfter} property has been decorated with {@link CustomReadAfterType}, and
 * is therefore not a string.
 */
export const CUSTOM_READ_AFTER_METADATA_KEY = 'CAUSA_CUSTOM_READ_AFTER';

/**
 * Decorates the `readAfter` property with a {@link Transform} decorator, which converts the value from a Base64
 * JSON-encoded string to an object of the `readAfter` type.
 *
 * @param target The page query class.
 * @param propertyName The name of the property to decorate. Always `readAfter`.
 * @param readAfterType The type of the `readAfter` property.
 */
function decorateReadAfterPropertyWithClassTransformer(
  target: PageQuery<any>,
  propertyName: 'readAfter',
  readAfterType: any,
) {
  Transform(
    ({ value }) => {
      try {
        // Checking whether the value is already an instance of the `readAfterType` is useful when deep copying a
        // `PageQuery` class using `instanceToInstance`.
        if (!value || value instanceof readAfterType) {
          return value;
        }

        const jsonString = Buffer.from(value, 'base64').toString();
        const plainValue = JSON.parse(jsonString);
        return plainToInstance(readAfterType, plainValue);
      } catch {
        throw new ValidationError(`Invalid pagination key '${propertyName}'.`, [
          propertyName,
        ]);
      }
    },
    { toClassOnly: true },
  )(target, propertyName);
}

/**
 * Decorates the `readAfter` property with a {@link Transform} decorator, which converts the value from an object of
 * the `readAfter` type to a Base64 JSON-encoded string.
 *
 * @param target The page query class.
 * @param propertyName The name of the property to decorate. Always `readAfter`.
 */
function decorateKeyPropertyWithPlainTransformer(
  target: PageQuery<any>,
  propertyName: 'readAfter',
) {
  Transform(
    ({ value }) => {
      if (!value) {
        return value;
      }

      return Buffer.from(JSON.stringify(value)).toString('base64');
    },
    { toPlainOnly: true },
  )(target, propertyName);
}

/**
 * Decorates {@link PageQuery.readAfter} of a {@link PageQuery} subclass to indicate that it is not a string, but a
 * custom type instead.
 * This will ensure the `readAfter` property is serialized as a Base64 JSON-encoded string, making it opaque to the
 * client. This also adds the {@link ValidateNested} decorator, to perform validation when parsing a query.
 */
export function CustomReadAfterType() {
  return function (target: PageQuery<any>, propertyName: 'readAfter') {
    Reflect.defineMetadata(
      CUSTOM_READ_AFTER_METADATA_KEY,
      true,
      target.constructor,
    );
    const keyType = Reflect.getMetadata('design:type', target, propertyName);

    decorateReadAfterPropertyWithClassTransformer(
      target,
      propertyName,
      keyType,
    );
    decorateKeyPropertyWithPlainTransformer(target, propertyName);
    ValidateNested()(target, propertyName);
  };
}
