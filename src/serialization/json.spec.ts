import { Transform } from 'class-transformer';
import { JsonObjectSerializer } from './json.js';

class MyObject {
  constructor(value?: string) {
    this.value = value ?? '';
  }

  @Transform(({ value }) => value.toUpperCase(), { toPlainOnly: true })
  @Transform(({ value }) => value.toLowerCase(), { toClassOnly: true })
  value!: string;
}

describe('JsonObjectSerializer', () => {
  let serializer: JsonObjectSerializer;

  beforeEach(() => {
    serializer = new JsonObjectSerializer();
  });

  describe('serialize', () => {
    it('should convert to a plain object and serialize to JSON', async () => {
      const obj = new MyObject('foo');

      const actualBuffer = await serializer.serialize(obj);

      expect(actualBuffer.toString()).toEqual('{"value":"FOO"}');
    });
  });

  describe('deserialize', () => {
    it('should deserialize from JSON and convert to an instance', async () => {
      const buffer = Buffer.from('{"value":"FOO"}');

      const actualInstance = await serializer.deserialize(MyObject, buffer);

      expect(actualInstance).toBeInstanceOf(MyObject);
      expect(actualInstance.value).toEqual('foo');
    });

    it('should deserialize from a serialized instance', async () => {
      const instance = new MyObject('📦');

      const actualBuffer = await serializer.serialize(instance);
      const actualInstance = await serializer.deserialize(
        MyObject,
        actualBuffer,
      );

      expect(actualInstance).toBeInstanceOf(MyObject);
      expect(actualInstance).toEqual(instance);
    });
  });
});
