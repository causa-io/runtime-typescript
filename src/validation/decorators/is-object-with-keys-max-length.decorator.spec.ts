import { validate } from 'class-validator';
import 'jest-extended';
import { AllowMissing } from './allow-missing.decorator.js';
import { IsNullable } from './is-nullable.decorator.js';
import { IsObjectWithKeysMaxLength } from './is-object-with-keys-max-length.decorator.js';

class MyObject {
  constructor(myObject: object) {
    this.myObject = myObject;
  }

  @IsObjectWithKeysMaxLength(2)
  @AllowMissing()
  @IsNullable()
  myObject?: Record<string, any> | null;
}

describe('IsObjectWithKeysMaxLength', () => {
  it('should validate an object with keys that do not exceed the length', async () => {
    const obj = new MyObject({ a: 1, b: 'abc' });

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });

  it('should not validate an object with keys that exceed the length', async () => {
    const obj = new MyObject({ a: 1, tooLong: '💤' });

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          isMapWithKeysMaxLength: `'myObject' should be an object with keys that are no longer than 2 characters.`,
        },
        property: 'myObject',
      }),
    ]);
  });
});
