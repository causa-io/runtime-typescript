import { IsString, validate } from 'class-validator';
import 'jest-extended';
import { AllowMissingIfPropertyDefined } from './allow-missing-if-property-defined.decorator.js';
import { AllowMissing } from './allow-missing.decorator.js';

class MyObject {
  constructor(data?: Partial<MyObject>) {
    Object.assign(this, data);
  }

  @IsString()
  @AllowMissingIfPropertyDefined('otherProperty')
  public property?: string;

  @IsString()
  @AllowMissing()
  public otherProperty?: string;
}

describe('AllowMissingIfPropertyDefined', () => {
  it('should validate when the decorated property is missing', async () => {
    const obj = new MyObject({ otherProperty: '✅' });

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });

  it('should validate when the decorated property is defined', async () => {
    const obj = new MyObject({ property: '✅', otherProperty: '✅' });

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });

  it('should not validate when both the decorated and other property are missing', async () => {
    const obj = new MyObject();

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: { isString: 'property must be a string' },
        property: 'property',
      }),
    ]);
  });
});
