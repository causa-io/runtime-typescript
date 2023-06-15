import { IsEmail, validate } from 'class-validator';
import 'jest-extended';
import { AllowMissing } from './allow-missing.decorator.js';

class MyObject {
  constructor(myEmail?: string) {
    this.myEmail = myEmail;
  }

  @AllowMissing()
  @IsEmail()
  myEmail?: string;
}

describe('AllowMissing', () => {
  it('should validate if the decorated property is missing', async () => {
    const obj = new MyObject();

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });

  it('should validate if the decorated property is valid', async () => {
    const obj = new MyObject('me@causa.io');

    const errors = await validate(obj);

    expect(errors).toBeEmpty();
  });

  it('should not validate if the decorated property is defined but invalid', async () => {
    const obj = new MyObject('📧');

    const errors = await validate(obj);

    expect(errors).toEqual([
      expect.objectContaining({
        constraints: {
          isEmail: 'myEmail must be an email',
        },
        property: 'myEmail',
      }),
    ]);
  });
});
