import { IsNumberString } from 'class-validator';
import 'jest-extended';
import { parseObject } from '../parser.js';
import { ValidateNestedType } from './validate-nested-type.decorator.js';

class MyChildObject {
  @IsNumberString()
  someString!: string;
}

class MyParentObject {
  @ValidateNestedType(() => MyChildObject)
  child!: MyChildObject;

  @ValidateNestedType(() => MyChildObject, { allowMissing: true })
  optionalChild?: MyChildObject;

  @ValidateNestedType(() => MyChildObject, { allowMissing: true })
  childArray?: MyChildObject[];
}

describe('ValidateNestedType', () => {
  it('should not validate a missing object when it is required', async () => {
    const actualPromise = parseObject(MyParentObject, {
      optionalChild: { someString: '123' },
    });

    await expect(actualPromise).rejects.toMatchObject({
      validationMessages: expect.toSatisfy((messages: string[]) => {
        expect(messages).toEqual(['child should not be null or undefined']);
        return true;
      }),
    });
  });

  it('should allow an object to be missing when it is not required', async () => {
    const actualObject = await parseObject(MyParentObject, {
      child: { someString: '123' },
    });

    expect(actualObject).toEqual({
      child: { someString: '123' },
    });
  });

  it('should not validate an invalid child property', async () => {
    const actualPromise = parseObject(MyParentObject, {
      child: { someString: 'abc' },
    });

    await expect(actualPromise).rejects.toMatchObject({
      validationMessages: expect.toSatisfy((messages: string[]) => {
        expect(messages).toContainEqual('someString must be a number string');
        return true;
      }),
    });
  });

  it('should transform and validate the object', async () => {
    const actualObject = await parseObject(MyParentObject, {
      child: { someString: '123' },
      optionalChild: { someString: '456' },
    });

    expect(actualObject).toEqual({
      child: { someString: '123' },
      optionalChild: { someString: '456' },
    });
    expect(actualObject.child).toBeInstanceOf(MyChildObject);
    expect(actualObject.optionalChild).toBeInstanceOf(MyChildObject);
  });

  it('should handle arrays', async () => {
    const actualObject = await parseObject(MyParentObject, {
      child: { someString: '123' },
      childArray: [{ someString: '456' }, { someString: '789' }],
    });

    expect(actualObject).toEqual({
      child: { someString: '123' },
      childArray: [{ someString: '456' }, { someString: '789' }],
    });
    expect(actualObject.child).toBeInstanceOf(MyChildObject);
    const actualChildArray = actualObject.childArray ?? [];
    expect(actualChildArray[0]).toBeInstanceOf(MyChildObject);
    expect(actualChildArray[1]).toBeInstanceOf(MyChildObject);
  });
});
