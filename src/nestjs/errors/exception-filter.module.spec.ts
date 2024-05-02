import { Controller, Get, HttpStatus, INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import 'jest-extended';
import { Logger as PinoLogger } from 'nestjs-pino';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import {
  EntityAlreadyExistsError,
  EntityNotFoundError,
  IncorrectEntityVersionError,
} from '../../errors/index.js';
import { getLoggedErrors, spyOnLogger } from '../../logging/testing.js';
import { LoggerModule } from '../logging/index.js';
import { ExceptionFilterModule } from './exception-filter.module.js';
import { ErrorResponse, HttpError } from './http-error.js';

class MyErrorDto implements ErrorResponse {
  readonly statusCode = HttpStatus.I_AM_A_TEAPOT;
  readonly message = '🫖';
  readonly errorCode = 'teapot';
}

class MyError extends HttpError<MyErrorDto> {
  constructor() {
    super(new MyErrorDto());
  }
}

@Controller('/')
class TestController {
  @Get('/VersionNotMatchingError')
  async notMatching() {
    throw new IncorrectEntityVersionError(
      {} as any,
      {},
      new Date(),
      new Date(),
    );
  }

  @Get('/EntityNotFoundError')
  async notFound() {
    throw new EntityNotFoundError({} as any, {});
  }

  @Get('/EntityAlreadyExistsError')
  async alreadyExists() {
    throw new EntityAlreadyExistsError({} as any, {});
  }

  @Get('/InternalServerError')
  async internalServerError() {
    throw new Error('💥');
  }

  @Get('/CustomError')
  async customError() {
    throw new MyError();
  }

  @Get('/HttpErrors')
  async httpErrors() {
    throw { statusCode: 413, message: '🍔' };
  }
}

describe('ExceptionFilterModule', () => {
  let app: INestApplication;
  let request: TestAgent<supertest.Test>;

  beforeEach(async () => {
    spyOnLogger();

    const testingModule = await Test.createTestingModule({
      imports: [ExceptionFilterModule, LoggerModule],
      controllers: [TestController],
    }).compile();
    app = testingModule.createNestApplication<NestExpressApplication>();
    app.useLogger(app.get(PinoLogger));
    await app.init();
    request = supertest(app.getHttpServer());
  });

  it('should return 409 when an EntityAlreadyExistsError is thrown', async () => {
    await request.get('/VersionNotMatchingError').expect(409, {
      statusCode: 409,
      message:
        'The provided version does not match the version of the resource on the server.',
      errorCode: 'incorrectVersion',
    });

    expect(getLoggedErrors()).toBeEmpty();
  });

  it('should return 409 when an EntityAlreadyExistsError is thrown', async () => {
    await request.get('/EntityAlreadyExistsError').expect(409, {
      statusCode: 409,
      message: 'The request conflicts with existing resource(s) on the server.',
      errorCode: 'conflict',
    });

    expect(getLoggedErrors()).toBeEmpty();
  });

  it('should return 404 when an EntityNotFoundError is thrown', async () => {
    await request.get('/EntityNotFoundError').expect(404, {
      statusCode: 404,
      message: 'The requested resource was not found on the server.',
      errorCode: 'notFound',
    });

    expect(getLoggedErrors()).toBeEmpty();
  });

  it('should return 500 with the correct format', async () => {
    await request.get('/InternalServerError').expect(500, {
      statusCode: 500,
      message: 'An unexpected error occurred on the server.',
      errorCode: 'internalServerError',
    });

    expect(getLoggedErrors({ predicate: (o) => o.message === '💥' })).toEqual([
      expect.objectContaining({
        req: expect.objectContaining({ url: '/InternalServerError' }),
        err: expect.objectContaining({
          message: '💥',
          stack: expect.stringContaining('💥'),
        }),
      }),
    ]);
  });

  it('should not convert a custom HTTP error to an InternalServerError', async () => {
    await request.get('/CustomError').expect(418, {
      statusCode: 418,
      message: '🫖',
      errorCode: 'teapot',
    });

    expect(getLoggedErrors()).toBeEmpty();
  });

  it('should handle http-errors', async () => {
    await request.get('/HttpErrors').expect(413, {
      statusCode: 413,
      message: '🍔',
    });

    expect(getLoggedErrors()).toBeEmpty();
  });
});
