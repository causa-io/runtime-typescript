import { validate } from 'class-validator';
import 'jest-extended';
import { HasUniqueValues } from './has-unique-values.decorator.js';
import { IsNullable } from './is-nullable.decorator.js';

describe('HasUniqueValues', () => {
  class MyClass {
    constructor(obj: any) {
      this.obj = obj;
    }

    @HasUniqueValues()
    @IsNullable()
    readonly obj?: any | null;
  }

  it('should not validate if the decorated property is not an array or object', async () => {
    const obj = new MyClass('🙅' as any);

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          hasUniqueValues: `'obj' should contain unique values.`,
        },
        property: 'obj',
      }),
    ]);
  });

  it('should not validate an array with duplicate values', async () => {
    const obj = new MyClass(['a', 'b', 'a']);

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          hasUniqueValues: `'obj' should contain unique values.`,
        },
        property: 'obj',
      }),
    ]);
  });

  it('should validate an array with unique values', async () => {
    const obj = new MyClass(['a', 'b', 'c']);

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });

  it('should not validate an object with duplicate values', async () => {
    const obj = new MyClass({ firstKey: 'a', secondKey: 'b', thirdKey: 'a' });

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          hasUniqueValues: `'obj' should contain unique values.`,
        },
        property: 'obj',
      }),
    ]);
  });

  it('should validate an object with unique values', async () => {
    const obj = new MyClass({ firstKey: 'a', secondKey: 'b', thirdKey: 'c' });

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });
});
