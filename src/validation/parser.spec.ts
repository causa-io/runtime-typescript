import { IsBoolean, IsString } from 'class-validator';
import 'jest-extended';
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
        validationMessages: expect.toSatisfy((messages: string[]) => {
          expect(messages.sort()).toEqual([
            'booleanProperty must be a boolean value',
            'property unknownProperty should not exist',
            'stringProperty must be a string',
          ]);
          return true;
        }),
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
        validationMessages: expect.toSatisfy((messages: string[]) => {
          expect(messages.sort()).toEqual([
            'booleanProperty must be a boolean value',
            'property unknownProperty should not exist',
            'stringProperty must be a string',
          ]);
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
