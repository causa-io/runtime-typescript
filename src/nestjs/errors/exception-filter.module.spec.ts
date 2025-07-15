import {
  Controller,
  Get,
  HttpStatus,
  type INestApplication,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import 'jest-extended';
import { Logger as PinoLogger } from 'nestjs-pino';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import {
  IncorrectEntityVersionError,
  RetryableError,
} from '../../errors/index.js';
import {
  getLoggedErrors,
  getLoggedWarnings,
  spyOnLogger,
} from '../../logging/testing.js';
import { LoggerModule } from '../logging/index.js';
import { ExceptionFilterModule } from './exception-filter.module.js';
import { throwHttpErrorResponse, type ErrorResponse } from './http-error.js';

class MyErrorDto implements ErrorResponse {
  readonly statusCode = HttpStatus.I_AM_A_TEAPOT;
  readonly message = '🫖';
  readonly errorCode = 'teapot';
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

  @Get('/InternalServerError')
  async internalServerError() {
    throw new Error('💥');
  }

  @Get('/CustomError')
  async customError() {
    throwHttpErrorResponse(new MyErrorDto());
  }

  @Get('/HttpErrors')
  async httpErrors() {
    throw { statusCode: 413, message: '🍔' };
  }

  @Get('/RetryableError')
  async retryableError() {
    throw new RetryableError('♻️');
  }
}

describe('ExceptionFilterModule', () => {
  let app: INestApplication;
  let request: TestAgent<supertest.Test>;

  beforeEach(async () => {
    spyOnLogger();

    const testingModule = await Test.createTestingModule({
      imports: [ExceptionFilterModule, LoggerModule.forRoot()],
      controllers: [TestController],
    }).compile();
    app = testingModule.createNestApplication<NestExpressApplication>();
    app.useLogger(app.get(PinoLogger));
    await app.init();
    request = supertest(app.getHttpServer());
  });

  it('should return 500 with the correct format', async () => {
    await request.get('/InternalServerError').expect(500, {
      statusCode: 500,
      message: 'An unexpected error occurred on the server.',
      errorCode: 'internalServerError',
    });

    expect(getLoggedErrors()).toEqual([
      expect.objectContaining({
        req: expect.objectContaining({ url: '/InternalServerError' }),
        error: expect.stringContaining('💥'),
        message: '💥',
      }),
    ]);
  });

  it('should return 503 and log a retryable error as a warning', async () => {
    await request.get('/RetryableError').expect(503, {
      statusCode: 503,
      message: 'The server is currently unable to handle the request.',
      errorCode: 'serviceUnavailable',
    });

    expect(getLoggedWarnings()).toEqual([
      expect.objectContaining({
        req: expect.objectContaining({ url: '/RetryableError' }),
        error: expect.stringContaining('♻️'),
        message: 'A retryable error was caught by the global exception filter.',
      }),
    ]);
    expect(getLoggedErrors()).toBeEmpty();
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
