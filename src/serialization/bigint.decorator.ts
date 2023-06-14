import { Transform } from 'class-transformer';

const bigIntToStringTransformer = Transform(({ value }) => value.toString(), {
  toPlainOnly: true,
});
const stringToBigIntTransformer = Transform(({ value }) => BigInt(value), {
  toClassOnly: true,
});

/**
 * Decorates a `bigint` property to be serialized as a `string`.
 * This also performs the reverse transformation when deserializing.
 */
export function JsonSerializableBigInt<
  P extends string,
  T extends { [p in P]: bigint },
>() {
  return (target: T, propertyKey: P) => {
    bigIntToStringTransformer(target, propertyKey);
    stringToBigIntTransformer(target, propertyKey);
  };
}
