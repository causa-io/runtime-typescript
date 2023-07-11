import { IsNumber, validate } from 'class-validator';
import 'jest-extended';
import { AllowMissing } from './allow-missing.decorator.js';
import { IsGreaterThanProperty } from './is-greater-than-property.decorator.js';
import { IsNullable } from './is-nullable.decorator.js';

class MyObject {
  constructor(data?: Partial<MyObject>) {
    Object.assign(this, data);
  }

  @IsGreaterThanProperty('otherProperty')
  property!: number;

  @IsNumber()
  @AllowMissing()
  otherProperty?: number;

  @AllowMissing()
  @IsGreaterThanProperty('optionalProperty', { requireOtherProperty: false })
  someOtherGreatProperty?: number;

  @IsNumber()
  @AllowMissing()
  @IsNullable()
  optionalProperty?: number | null;
}

describe('IsGreaterThanProperty', () => {
  it('should validate when the decorated property is greater than the other property', async () => {
    const obj = new MyObject({ property: 2, otherProperty: 1 });

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });

  it('should not validate when the decorated property is equal to the other property', async () => {
    const obj = new MyObject({ property: 1, otherProperty: 1 });

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          isGreaterThanProperty: `'property' should be greater than 'otherProperty'.`,
        },
        property: 'property',
      }),
    ]);
  });

  it('should not validate when the other property is missing', async () => {
    const obj = new MyObject({ property: 1 });

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          isGreaterThanProperty: `'property' should be greater than 'otherProperty'.`,
        },
        property: 'property',
      }),
    ]);
  });

  it('should validate when the other property is not required', async () => {
    const obj = new MyObject({
      property: 2,
      otherProperty: 1,
      someOtherGreatProperty: 10,
    });

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });
});
