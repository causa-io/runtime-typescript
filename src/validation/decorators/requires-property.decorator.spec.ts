import { IsString, validate } from 'class-validator';
import 'jest-extended';
import { validatorOptions } from '../configuration.js';
import { AllowMissing } from './allow-missing.decorator.js';
import { IsNullable } from './is-nullable.decorator.js';
import { RequiresProperty } from './requires-property.decorator.js';

class MyObject {
  constructor(data?: Partial<MyObject>) {
    Object.assign(this, data);
  }

  @RequiresProperty('otherProperty')
  @AllowMissing()
  firstProperty?: string;

  @IsString()
  @AllowMissing()
  @IsNullable()
  otherProperty?: string | null;
}

describe('RequiresProperty', () => {
  it('should fail when the other property is undefined', async () => {
    const obj = new MyObject({ firstProperty: '❌' });

    const errors = await validate(obj, validatorOptions);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          requiresProperty: `'firstProperty' requires 'otherProperty' to be defined as well.`,
        },
        property: 'firstProperty',
      }),
    ]);
  });

  it('should fail when the other property is null', async () => {
    const obj = new MyObject({ firstProperty: '❌', otherProperty: null });

    const errors = await validate(obj, validatorOptions);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          requiresProperty: `'firstProperty' requires 'otherProperty' to be defined as well.`,
        },
        property: 'firstProperty',
      }),
    ]);
  });

  it('should validate when the other property is defined', async () => {
    const obj = new MyObject({
      firstProperty: '✅',
      otherProperty: '✅',
    });

    const errors = await validate(obj, validatorOptions);

    expect(errors).toBeEmpty();
  });

  it('should validate when the property is missing', async () => {
    const obj = new MyObject({ otherProperty: '✅' });

    const errors = await validate(obj, validatorOptions);

    expect(errors).toBeEmpty();
  });
});
