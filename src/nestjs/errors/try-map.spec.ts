import { HttpException, HttpStatus } from '@nestjs/common';
import { tryMap } from '../../errors/map.js';
import { ValidationError } from '../../validation/index.js';
import { ErrorDto } from './errors.dto.js';
import { toDto, toDtoType, validationErrorAsDto } from './try-map.js';

class MyError extends Error {}

class MyValidationError extends ValidationError {}

class MyDto extends ErrorDto {
  readonly statusCode = HttpStatus.BAD_REQUEST;

  readonly errorCode = '🚨';

  constructor(readonly message: string = '🤷') {
    super();
  }
}

describe('toDto', () => {
  it('should catch the error and return the corresponding DTO', async () => {
    const actualPromise = tryMap(
      async () => {
        throw new MyError('💥');
      },
      toDto(MyError, (e) => new MyDto(e.message)),
    );

    await expect(actualPromise).rejects.toThrow(HttpException);
    await expect(actualPromise).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: '🚨',
        message: '💥',
      }),
    });
  });
});

describe('toDtoType', () => {
  it('should catch the error and return the corresponding DTO type', async () => {
    const actualPromise = tryMap(
      async () => {
        throw new MyError('💥');
      },
      toDtoType(MyError, MyDto),
    );

    await expect(actualPromise).rejects.toThrow(HttpException);
    await expect(actualPromise).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: '🚨',
        message: '🤷',
      }),
    });
  });
});

describe('validationErrorAsDto', () => {
  it('should catch the error and format the validation messages', async () => {
    const actualPromise = tryMap(async () => {
      throw new ValidationError(
        ['stringProperty must be a string', 'id must be a UUID'],
        ['stringProperty', 'child.id'],
      );
    }, validationErrorAsDto());

    await expect(actualPromise).rejects.toThrow(HttpException);
    await expect(actualPromise).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'invalidInput',
        message: '- stringProperty must be a string\n- id must be a UUID',
        fields: ['stringProperty', 'child.id'],
      },
    });
  });

  it('should catch an error of the given narrower type', async () => {
    const actualPromise = tryMap(async () => {
      throw new MyValidationError(['💥'], ['someProperty']);
    }, validationErrorAsDto(MyValidationError));

    await expect(actualPromise).rejects.toThrow(HttpException);
    await expect(actualPromise).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: {
        errorCode: 'invalidInput',
        message: '- 💥',
        fields: ['someProperty'],
      },
    });
  });

  it('should not catch an error that is not of the given narrower type', async () => {
    const actualPromise = tryMap(async () => {
      throw new ValidationError(['💥']);
    }, validationErrorAsDto(MyValidationError));

    await expect(actualPromise).rejects.toThrow(ValidationError);
  });
});
