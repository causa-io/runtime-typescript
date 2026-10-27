import type { Type } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import type { ObjectSerializer } from './object-serializer.js';

/**
 * Describes the resulting type when serializing `T` to JSON.
 * Many JavaScript types will be converted to string when serialized as JSON. {@link JsonSerializationOf} takes any
 * TypeScript type and converts types that requires this serialization to `string`.
 * By default, the conversion is applied to `Date` and `bigint`.
 */
export type JsonSerializationOf<T, S = Date | bigint> = T extends S
  ? string
  : { [P in keyof T]: T[P] extends S ? string : JsonSerializationOf<T[P]> };

/**
 * Describes any type that can be serialized as `T`.
 * Many JavaScript types must be converted to string when serialized as JSON. {@link JsonSerializableTo} takes a
 * JSON-compatible type (e.g. a JSONSchema) and converts it to a type where `string`s are replaced by unions of all
 * possible types that would be serialized as `string`.
 * By default, the union contains `Date` and `bigint`.
 */
export type JsonSerializableTo<T, S = Date | bigint> = string extends T
  ? T | S
  : {
      [P in keyof T]: string extends T[P] ? T[P] | S : JsonSerializableTo<T[P]>;
    };

/**
 * Options for the {@link JsonObjectSerializer}.
 */
export type JsonObjectSerializerOptions = {
  /**
   * Whether objects should be converted to plain objects using `class-transformer` before being serialized.
   * This applies `class-transformer` decorators at the cost of deep-copying each serialized object.
   * Defaults to `false`.
   */
  readonly transformOnSerialize?: boolean;
};

/**
 * An {@link ObjectSerializer} that serializes and deserializes objects to and from JSON.
 * By default, objects are serialized using `JSON.stringify` only, which means `class-transformer` decorators are not
 * applied. The `transformOnSerialize` option can be set to apply them.
 * Deserialization uses `class-transformer` to convert the parsed JSON to an instance of the requested type, which means
 * decorators can be used to customize it.
 */
export class JsonObjectSerializer implements ObjectSerializer {
  /**
   * Creates a new {@link JsonObjectSerializer}.
   *
   * @param options Options for the serializer.
   */
  constructor(private readonly options: JsonObjectSerializerOptions = {}) {}

  async serialize(obj: any): Promise<Buffer> {
    const plain = this.options.transformOnSerialize
      ? instanceToPlain(obj)
      : obj;
    return Buffer.from(JSON.stringify(plain));
  }

  async deserialize<T>(type: Type<T>, buffer: Buffer): Promise<T> {
    const plainObject = JSON.parse(buffer.toString());
    return plainToInstance(type, plainObject);
  }
}
