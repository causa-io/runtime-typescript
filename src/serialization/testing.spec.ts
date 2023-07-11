import { Transform } from 'class-transformer';
import { serializeAsJavaScriptObject } from './testing.js';

describe('testing', () => {
  describe('serializeAsJavaScriptObject', () => {
    class MyObject {
      constructor(data: Partial<MyObject>) {
        Object.assign(this, data);
      }

      @Transform(({ value }) => value.toUpperCase(), { toPlainOnly: true })
      @Transform(({ value }) => value.toLowerCase(), { toClassOnly: true })
      myString!: string;
    }

    it('should serialize a simple object', async () => {
      const obj = { a: 1, b: '2', c: true, d: new Date() };

      const actualSerialized = await serializeAsJavaScriptObject(obj);

      expect(actualSerialized).toEqual({
        ...obj,
        d: obj.d.toISOString(),
      });
    });

    it('should serialize an object with transforms', async () => {
      const obj = new MyObject({ myString: 'hello' });

      const actualSerialized = await serializeAsJavaScriptObject(obj);

      expect(actualSerialized).toEqual({ myString: 'HELLO' });
    });
  });
});
