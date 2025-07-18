import { HttpException, HttpStatus } from '@nestjs/common';
import { tryMap } from '../../errors/map.js';
import { ErrorDto } from './errors.dto.js';
import { toDto, toDtoType } from './try-map.js';

class MyError extends Error {}

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
