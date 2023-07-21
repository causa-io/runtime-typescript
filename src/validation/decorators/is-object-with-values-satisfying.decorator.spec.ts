import { isInt, validate } from 'class-validator';
import 'jest-extended';
import { IsObjectWithValuesSatisfying } from './is-object-with-values-satisfying.decorator.js';

class MyObject {
  constructor(myObject: object) {
    this.myObject = myObject;
  }

  @IsObjectWithValuesSatisfying(isInt)
  myObject!: object;
}

describe('IsObjectWithValuesSatisfying', () => {
  it('should validate an object with values satisfying the predicate', async () => {
    const obj = new MyObject({ a: 1, b: 2 });

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });

  it('should not validate an object with values not satisfying the predicate', async () => {
    const obj = new MyObject({ a: 1, b: 1.23 });

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          isObjectWithValuesSatisfying: `'myObject' should be an object with values satisfying the predicate.`,
        },
        property: 'myObject',
      }),
    ]);
  });
});
