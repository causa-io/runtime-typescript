import { instanceToPlain, plainToInstance } from 'class-transformer';
import { JsonSerializableBigInt } from './bigint.decorator.js';

class MyObject {
  constructor(value: bigint | null | undefined) {
    this.value = value;
  }

  @JsonSerializableBigInt()
  value?: bigint | null;
}

describe('JsonSerializableBigInt', () => {
  describe('instance to plain', () => {
    it('should transform a BigInt to a string', () => {
      const obj = new MyObject(123n);

      const actualPlain = instanceToPlain(obj);

      expect(actualPlain).toEqual({ value: '123' });
    });

    it('should passthrough a null value', () => {
      const obj = new MyObject(null);

      const actualPlain = instanceToPlain(obj);

      expect(actualPlain).toEqual({ value: null });
    });

    it('should passthrough an undefined value', () => {
      const obj = new MyObject(undefined);

      const actualPlain = instanceToPlain(obj);

      expect(actualPlain).toEqual({ value: undefined });
    });
  });

  describe('plain to instance', () => {
    it('should transform a string to a BigInt', () => {
      const plain = { value: '123' };

      const actualInstance = plainToInstance(MyObject, plain);

      expect(actualInstance).toEqual({ value: 123n });
    });

    it('should passthrough a null value', () => {
      const plain = { value: null };

      const actualInstance = plainToInstance(MyObject, plain);

      expect(actualInstance).toEqual({ value: null });
    });

    it('should passthrough an undefined value', () => {
      const plain = { value: undefined };

      const actualInstance = plainToInstance(MyObject, plain);

      expect(actualInstance).toEqual({ value: undefined });
    });
  });
});
