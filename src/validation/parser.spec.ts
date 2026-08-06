import { IsBoolean, IsString, MaxLength } from 'class-validator';
import 'jest-extended';
import { ValidateNestedType } from './decorators/index.js';
import { ValidationError } from './errors.js';
import { parseObject, validateObject } from './parser.js';

class MyObject {
  constructor(data: MyObject) {
    Object.assign(this, data);
  }

  @IsString()
  stringProperty!: string;

  @IsBoolean()
  booleanProperty!: boolean;
}

class MyObjectWithSeveralConstraints {
  constructor(data: MyObjectWithSeveralConstraints) {
    Object.assign(this, data);
  }

  @IsString()
  @MaxLength(3)
  stringProperty!: string;
}

class MyParentObject {
  constructor(data: MyParentObject) {
    Object.assign(this, data);
  }

  @ValidateNestedType(() => MyObject)
  child!: MyObject;

  @ValidateNestedType(() => MyObject)
  children!: MyObject[];
}

describe('parser', () => {
  describe('validateObject', () => {
    it('should validate the given object', async () => {
      const obj = new MyObject({
        stringProperty: '✅',
        booleanProperty: false,
      });

      const actualPromise = validateObject(obj);

      await expect(actualPromise).resolves.toBeUndefined();
    });

    it('should throw if the given object is invalid', async () => {
      const obj = new MyObject({
        stringProperty: null as any,
        booleanProperty: undefined as any,
      });
      (obj as any).unknownProperty = '👋';

      const actualPromise = validateObject(obj);

      await expect(actualPromise).rejects.toThrow(ValidationError);
      await expect(actualPromise).rejects.toMatchObject({
        validationMessages: expect.toIncludeSameMembers([
          'booleanProperty must be a boolean value',
          'property unknownProperty should not exist',
          'stringProperty must be a string',
        ]),
        fields: expect.toIncludeSameMembers([
          'booleanProperty',
          'stringProperty',
          'unknownProperty',
        ]),
      });
    });

    it('should not allow a non-object input', async () => {
      const actualPromise = validateObject('👋' as any);

      await expect(actualPromise).rejects.toThrow(ValidationError);
      await expect(actualPromise).rejects.toMatchObject({
        validationMessages: expect.toSatisfy((messages: string[]) => {
          expect(messages).toEqual(['input must be an object']);
          return true;
        }),
        fields: [],
      });
    });

    it('should not validate a null object', async () => {
      const actualPromise = validateObject(null as any);

      await expect(actualPromise).rejects.toThrow(ValidationError);
      await expect(actualPromise).rejects.toMatchObject({
        validationMessages: expect.toSatisfy((messages: string[]) => {
          expect(messages).toEqual(['input must be an object']);
          return true;
        }),
        fields: [],
      });
    });

    it('should accept custom options', async () => {
      const obj = new MyObject({
        stringProperty: '✅',
        booleanProperty: undefined as any,
      });
      (obj as any).unknownProperty = '👋';

      const actualPromise = validateObject(obj, {
        forbidNonWhitelisted: false,
        skipUndefinedProperties: true,
      });

      await expect(actualPromise).resolves.toBeUndefined();
    });

    it('should deduplicate the fields that failed validation', async () => {
      const obj = new MyObjectWithSeveralConstraints({
        stringProperty: 1234 as any,
      });

      const actualPromise = validateObject(obj);

      await expect(actualPromise).rejects.toMatchObject({
        validationMessages: expect.toIncludeSameMembers([
          'stringProperty must be a string',
          'stringProperty must be shorter than or equal to 3 characters',
        ]),
        fields: ['stringProperty'],
      });
    });

    it('should reference the paths to the nested fields that failed validation', async () => {
      const obj = new MyParentObject({
        child: new MyObject({
          stringProperty: '✅',
          booleanProperty: '❌' as any,
        }),
        children: [
          new MyObject({ stringProperty: '✅', booleanProperty: true }),
          new MyObject({ stringProperty: 1234 as any, booleanProperty: true }),
        ],
      });

      const actualPromise = validateObject(obj);

      await expect(actualPromise).rejects.toMatchObject({
        fields: expect.toIncludeSameMembers([
          'child.booleanProperty',
          'children.1.stringProperty',
        ]),
      });
    });

    it('should not reference any field when the input has no validation metadata', async () => {
      const actualPromise = validateObject({ someProperty: '👋' });

      await expect(actualPromise).rejects.toMatchObject({
        validationMessages: [
          'an unknown value was passed to the validate function',
        ],
        fields: [],
      });
    });
  });

  describe('parseObject', () => {
    it('should parse the given object', async () => {
      const obj = {
        stringProperty: '✅',
        booleanProperty: false,
      };

      const actualObject = await parseObject(MyObject, obj);

      expect(actualObject).toEqual({
        stringProperty: '✅',
        booleanProperty: false,
      });
      expect(actualObject).toBeInstanceOf(MyObject);
    });

    it('should throw if the given object is invalid', async () => {
      const obj = {
        stringProperty: null,
        booleanProperty: undefined,
        unknownProperty: '👋',
      };

      const actualPromise = parseObject(MyObject, obj);

      await expect(actualPromise).rejects.toThrow(ValidationError);
      await expect(actualPromise).rejects.toMatchObject({
        validationMessages: expect.toIncludeSameMembers([
          'booleanProperty must be a boolean value',
          'property unknownProperty should not exist',
          'stringProperty must be a string',
        ]),
        fields: expect.toIncludeSameMembers([
          'booleanProperty',
          'stringProperty',
          'unknownProperty',
        ]),
      });
    });

    it('should throw if the passed payload is not an object', async () => {
      const actualPromise = parseObject(MyObject, '👋');

      await expect(actualPromise).rejects.toThrow(ValidationError);
      await expect(actualPromise).rejects.toMatchObject({
        validationMessages: expect.toSatisfy((messages: string[]) => {
          expect(messages).toEqual(['payload must be a plain object']);
          return true;
        }),
        fields: [],
      });
    });

    it('should throw if the passed payload cannot be converted because of class-transform special cases', async () => {
      const actualPromise = parseObject(MyObject, new Date());

      await expect(actualPromise).rejects.toThrow(ValidationError);
      await expect(actualPromise).rejects.toMatchObject({
        validationMessages: expect.toSatisfy((messages: string[]) => {
          expect(messages).toEqual(['payload must be a plain object']);
          return true;
        }),
      });

      const actualPromise2 = parseObject(MyObject, Buffer.from(''));

      await expect(actualPromise2).rejects.toThrow(ValidationError);
      await expect(actualPromise2).rejects.toMatchObject({
        validationMessages: expect.toSatisfy((messages: string[]) => {
          expect(messages).toEqual(['payload must be a plain object']);
          return true;
        }),
      });
    });

    it('should accept custom options', async () => {
      const obj = {
        stringProperty: '✅',
        booleanProperty: undefined,
        unknownProperty: '👋',
      };

      const actualObject = await parseObject(MyObject, obj, {
        forbidNonWhitelisted: false,
        skipUndefinedProperties: true,
      });

      expect(actualObject).toEqual({
        stringProperty: '✅',
        booleanProperty: undefined,
      });
      expect(actualObject).toBeInstanceOf(MyObject);
    });
  });
});
