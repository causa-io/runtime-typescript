import { Type } from '@nestjs/common';

/**
 * Defines a class that can serialize and deserialize objects to {@link Buffer}s.
 */
export interface ObjectSerializer {
  /**
   * Deserializes a {@link Buffer} to an object of type `T`.
   *
   * @param type The class of the object to deserialize.
   * @param data The data to deserialize.
   * @returns The deserialized object.
   */
  deserialize<T>(type: Type<T>, data: Buffer): Promise<T>;

  /**
   * Serializes the JavaScript object to a buffer.
   *
   * @param obj The object to serialize.
   * @returns The serialized object.
   */
  serialize(obj: any): Promise<Buffer>;
}
