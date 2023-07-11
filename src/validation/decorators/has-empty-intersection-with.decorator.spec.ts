import { IsString, validate } from 'class-validator';
import 'jest-extended';
import { AllowMissing } from './allow-missing.decorator.js';
import { HasEmptyIntersectionWith } from './has-empty-intersection-with.decorator.js';
import { IsNullable } from './is-nullable.decorator.js';

describe('HasEmptyIntersectionWith', () => {
  class MyClassWithArrays {
    constructor(array1: string[], array2?: string[]) {
      this.array1 = array1;
      if (array2) {
        this.array2 = array2;
      }
    }

    @HasEmptyIntersectionWith('array2')
    readonly array1: string[];

    @AllowMissing()
    @IsNullable()
    @IsString({ each: true })
    readonly array2?: string[] | null;
  }

  it('should not validate if the decorated property is not an array', async () => {
    const obj = new MyClassWithArrays('🙅' as any, ['el3', 'el1']);

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          hasEmptyIntersectionWith: `'array1' should not have any elements in common with 'array2'.`,
        },
        property: 'array1',
      }),
    ]);
  });

  it('should not validate if the other property is not an array', async () => {
    const obj = new MyClassWithArrays(['el1', 'el2'], 123 as any);

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          hasEmptyIntersectionWith: `'array1' should not have any elements in common with 'array2'.`,
        },
        property: 'array1',
      }),
      // Error about the other property not being an array.
      expect.any(Object),
    ]);
  });

  it('should validate two arrays without any element in common', async () => {
    const obj = new MyClassWithArrays(['el1', 'el2'], ['el3', 'el4']);

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });

  it('should not validate two arrays with elements in common', async () => {
    const obj = new MyClassWithArrays(['el1', 'el2'], ['el3', 'el1']);

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          hasEmptyIntersectionWith: `'array1' should not have any elements in common with 'array2'.`,
        },
        property: 'array1',
      }),
    ]);
  });

  it('should validate when the second array is undefined', async () => {
    const obj = new MyClassWithArrays(['el1', 'el2']);

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });
});
