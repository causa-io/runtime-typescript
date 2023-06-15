import { validate } from 'class-validator';
import 'jest-extended';
import { AllowMissing } from './allow-missing.decorator.js';
import { RequiresPropertyNotToBeDefined } from './requires-property-not-to-be-defined.decorator.js';

class MyObject {
  constructor(data?: Partial<MyObject>) {
    Object.assign(this, data);
  }

  @RequiresPropertyNotToBeDefined('otherProperty')
  @AllowMissing()
  firstProperty?: string;

  @AllowMissing()
  otherProperty?: string | null;
}

describe('RequiresPropertyNotToBeDefined', () => {
  it('should fail when the other property is defined', async () => {
    const obj = new MyObject({
      firstProperty: '❌',
      otherProperty: '❌',
    });

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          requiresPropertyNotToBeDefined: `'otherProperty' should not be defined when 'firstProperty' is present.`,
        },
        property: 'firstProperty',
      }),
    ]);
  });

  it('should fail when the other property is null', async () => {
    const obj = new MyObject({ firstProperty: '✅', otherProperty: null });

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          requiresPropertyNotToBeDefined: `'otherProperty' should not be defined when 'firstProperty' is present.`,
        },
        property: 'firstProperty',
      }),
    ]);
  });

  it('should validate when the other property is undefined', async () => {
    const obj = new MyObject({ firstProperty: '✅' });

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });

  it('should validate when the decorated property is missing', async () => {
    const obj = new MyObject({ otherProperty: '✅' });

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });
});
