import { IsString, validate } from 'class-validator';
import 'jest-extended';
import { validatorOptions } from '../configuration.js';
import { IsNullable } from './is-nullable.decorator.js';

class MyObject {
  constructor(data?: Partial<MyObject>) {
    Object.assign(this, data);
  }

  @IsNullable()
  @IsString()
  value!: string | null;

  @IsString()
  nonNullableValue = '✅';
}

describe('IsNullable', () => {
  it('should skip validation when value is null', async () => {
    const obj = new MyObject({ value: null });

    const errors = await validate(obj, validatorOptions);

    expect(errors).toBeEmpty();
  });

  it('should fail when value is undefined', async () => {
    const obj = new MyObject();

    const errors = await validate(obj, validatorOptions);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: { isString: 'value must be a string' },
        property: 'value',
      }),
    ]);
  });

  it('should fail for an invalid value', async () => {
    const obj = new MyObject({ value: 12 as any });

    const errors = await validate(obj, validatorOptions);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: { isString: 'value must be a string' },
        property: 'value',
      }),
    ]);
  });

  it('should accept a valid value', async () => {
    const obj = new MyObject({ value: '👍' });

    const errors = await validate(obj, validatorOptions);

    expect(errors).toBeEmpty();
  });

  it('should reject a null value when the property is not nullable', async () => {
    const obj = new MyObject({ value: '👍', nonNullableValue: null as any });

    const errors = await validate(obj, validatorOptions);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: { isString: 'nonNullableValue must be a string' },
        property: 'nonNullableValue',
      }),
    ]);
  });
});
