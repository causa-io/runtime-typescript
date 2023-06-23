import {
  Controller,
  ExecutionContext,
  INestApplication,
  Injectable,
  Post,
} from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';
import { Request } from 'express';
import 'jest-extended';
import { PinoLogger } from 'nestjs-pino';
import supertest from 'supertest';
import { RetryableError } from '../../errors/index.js';
import { InvalidEventError } from '../../events/index.js';
import {
  getLoggedErrors,
  getLoggedInfos,
  getLoggedWarnings,
  spyOnLogger,
} from '../../logging/testing.js';
import { JsonObjectSerializer } from '../../serialization/index.js';
import { LoggerModule } from '../logging/index.js';
import {
  BaseEventHandlerInterceptor,
  ParsedEventRequest,
} from './base.interceptor.js';
import { EventBody } from './event-body.decorator.js';

@Injectable()
class MyEventHandlerInterceptor extends BaseEventHandlerInterceptor {
  constructor(
    protected readonly reflector: Reflector,
    protected readonly logger: PinoLogger,
  ) {
    super(new JsonObjectSerializer(), reflector, logger);
  }

  protected async parseEventFromContext(
    context: ExecutionContext,
  ): Promise<ParsedEventRequest> {
    const request = context.switchToHttp().getRequest<Request>();

    const boomHeader = request.headers['x-boom'];
    if (boomHeader === 'invalidEvent') {
      throw new InvalidEventError('💥');
    } else if (boomHeader === 'unknownError') {
      throw new Error('❓');
    }

    return {
      body: Buffer.from(JSON.stringify(request.body)),
    };
  }
}

class MyEvent {
  @IsString()
  id!: string;

  @Transform(({ value }) => value.toUpperCase())
  @IsString()
  someValue!: string;
}

@Controller()
class MyController {
  constructor(private readonly logger: PinoLogger) {}

  @Post()
  async handleEvent(@EventBody() body: MyEvent) {
    if (body.someValue === '♻️') {
      throw new RetryableError('♻️', 500);
    } else if (body.someValue === '💥') {
      throw new Error('💥');
    }

    this.logger.info('👋');
    return body;
  }

  @Post('/other')
  async other() {
    return;
  }
}

describe('BaseEventHandlerInterceptor', () => {
  let app: INestApplication;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(async () => {
    spyOnLogger();

    const testModule = await Test.createTestingModule({
      imports: [LoggerModule],
      controllers: [MyController],
      providers: [
        { provide: APP_INTERCEPTOR, useClass: MyEventHandlerInterceptor },
      ],
    }).compile();
    app = testModule.createNestApplication();
    await app.init();
    request = supertest(app.getHttpServer());
  });

  afterEach(async () => {
    await app?.close();
  });

  it('should parse and validate the event body', async () => {
    await request
      .post('/')
      .send({ id: '1234', someValue: 'hello' })
      .expect(201, { id: '1234', someValue: 'HELLO' });

    expect(getLoggedInfos({ predicate: (o) => o.message === '👋' })).toEqual([
      expect.objectContaining({
        eventId: '1234',
      }),
    ]);
  });

  it('should allow extra properties in the event body and remove them', async () => {
    await request
      .post('/')
      .send({ id: '1234', someValue: 'hello', extra: '🍰' })
      .expect(201, { id: '1234', someValue: 'HELLO' });
  });

  it('should log an error and return 201 if the event body is invalid', async () => {
    await request.post('/').send({ id: '1234' }).expect(201);

    expect(
      getLoggedInfos({ predicate: (o) => o.message === '👋' }),
    ).toBeEmpty();
    expect(getLoggedErrors()).toEqual([
      expect.objectContaining({
        eventId: '1234',
        validationMessages: ['someValue must be a string'],
      }),
    ]);
  });

  it('should not process a route without the event body decorator', async () => {
    await request.post('/other').expect(201);

    expect(
      getLoggedInfos({ predicate: (o) => o.message === '👋' }),
    ).toBeEmpty();
    expect(getLoggedErrors()).toBeEmpty();
  });

  it('should catch InvalidEventErrors from the parser', async () => {
    await request.post('/').set('x-boom', 'invalidEvent').expect(201);

    expect(
      getLoggedInfos({ predicate: (o) => o.message === '👋' }),
    ).toBeEmpty();
  });

  it('should not catch unknown errors from the parser', async () => {
    await request.post('/').set('x-boom', 'unknownError').expect(500);

    expect(
      getLoggedInfos({ predicate: (o) => o.message === '👋' }),
    ).toBeEmpty();
  });

  it('should return 503 when the handler throws a retryable error', async () => {
    const requestTime = Date.now();
    await request.post('/').send({ id: '1234', someValue: '♻️' }).expect(503);
    const responseTime = Date.now();

    expect(responseTime - requestTime).toBeGreaterThanOrEqual(500);
    expect(
      getLoggedInfos({ predicate: (o) => o.message === '👋' }),
    ).toBeEmpty();
    expect(getLoggedWarnings()).toEqual([
      expect.objectContaining({
        eventId: '1234',
        error: expect.stringContaining('♻️'),
        message: '♻️',
      }),
    ]);
    expect(getLoggedErrors()).toBeEmpty();
  });

  it('should return 201 and log an error when the handler throws a non-retryable error', async () => {
    await request.post('/').send({ id: '1234', someValue: '💥' }).expect(201);

    expect(
      getLoggedInfos({ predicate: (o) => o.message === '👋' }),
    ).toBeEmpty();
    expect(getLoggedErrors()).toEqual([
      expect.objectContaining({
        eventId: '1234',
        error: expect.stringContaining('💥'),
        message: '💥',
      }),
    ]);
  });
});
