import {
  CallHandler,
  Controller,
  ExecutionContext,
  INestApplication,
  Injectable,
  NestInterceptor,
  Post,
} from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';
import { Request } from 'express';
import { Observable } from 'rxjs';
import supertest from 'supertest';
import { parseObject } from '../../index.js';
import {
  EVENT_BODY_TYPE_KEY,
  EventBody,
  RequestWithEvent,
} from './event-body.decorator.js';

class MyEvent {
  // This ensures that the event body is parsed and validated.
  @Transform(({ value }) => value.toUpperCase())
  @IsString()
  someValue!: string;
}

@Controller()
class MyController {
  @Post()
  async handleEvent(@EventBody() body: MyEvent) {
    return body;
  }
}

@Injectable()
class MyEventInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context
      .switchToHttp()
      .getRequest<Request & RequestWithEvent>();

    const dataType = this.reflector.get(
      EVENT_BODY_TYPE_KEY,
      context.getHandler(),
    );

    request.eventBody = await parseObject(dataType, request.body);

    return next.handle();
  }
}

describe('EventBody', () => {
  let app: INestApplication;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(async () => {
    const testModule = await Test.createTestingModule({
      controllers: [MyController],
      providers: [{ provide: APP_INTERCEPTOR, useClass: MyEventInterceptor }],
    }).compile();
    app = testModule.createNestApplication();
    await app.init();
    request = supertest(app.getHttpServer());
  });

  afterEach(async () => {
    await app?.close();
  });

  it('should define the metadata and retrieve the event body', async () => {
    await request.post('/').send({ someValue: 'hello' }).expect(201, {
      someValue: 'HELLO',
    });
    await request.post('/').send({ someValue: 123 }).expect(500);
  });
});