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
 * An {@link ObjectSerializer} that serializes and deserializes objects to and from JSON.
 * It uses `class-transformer` to convert instances to plain objects and vice-versa.
 * This means decorators can be used to customize the (de)serialization.
 */
export class JsonObjectSerializer implements ObjectSerializer {
  async serialize(obj: any): Promise<Buffer> {
    const plain = instanceToPlain(obj);
    return Buffer.from(JSON.stringify(plain));
  }

  async deserialize<T>(type: Type<T>, buffer: Buffer): Promise<T> {
    const plainObject = JSON.parse(buffer.toString());
    return plainToInstance(type, plainObject);
  }
}
