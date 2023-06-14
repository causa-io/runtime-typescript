import { instanceToPlain, plainToInstance } from 'class-transformer';
import { JsonSerializableBigInt } from './bigint.decorator.js';

class MyObject {
  constructor(value: bigint) {
    this.value = value;
  }

  @JsonSerializableBigInt()
  value!: bigint;
}

describe('JsonSerializableBigInt', () => {
  it('should transform a BigInt to a string', () => {
    const obj = new MyObject(123n);

    const actualPlain = instanceToPlain(obj);

    expect(actualPlain).toEqual({ value: '123' });
  });

  it('should transform a string to a BigInt', () => {
    const plain = { value: '123' };

    const actualInstance = plainToInstance(MyObject, plain);

    expect(actualInstance).toEqual({ value: 123n });
  });
});
