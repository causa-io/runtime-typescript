import { JsonObjectSerializer } from './json.js';

/**
 * The default serializer used by testing utilities.
 */
const testingJsonSerializer = new JsonObjectSerializer();

/**
 * Serializes the given object as a JavaScript object.
 * It applies the same serialization process as {@link JsonObjectSerializer.serialize}, and returns the parsed JSON
 * object. It does not use {@link JsonObjectSerializer.deserialize}, and returns the plain JavaScript object, as it
 * would exist in an HTTP response or an event.
 *
 * @param obj The object to serialize.
 * @returns The serialized object.
 */
export async function serializeAsJavaScriptObject(obj: any): Promise<any> {
  const buffer = await testingJsonSerializer.serialize(obj);
  return JSON.parse(buffer.toString());
}
