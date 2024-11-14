import {
  type CallHandler,
  Controller,
  type ExecutionContext,
  type INestApplication,
  Injectable,
  type NestInterceptor,
  Post,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Observable } from 'rxjs';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import { EventAttributes } from './event-attributes.decorator.js';
import type { RequestWithEvent } from './request-with-event.js';

@Controller()
class MyController {
  @Post()
  async handleEvent(@EventAttributes() attributes: Record<string, string>) {
    return attributes.someAttribute;
  }
}

@Injectable()
class MyEventInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context
      .switchToHttp()
      .getRequest<Request & RequestWithEvent>();

    request.eventAttributes = request.body as unknown as Record<string, string>;

    return next.handle();
  }
}

describe('EventAttributes', () => {
  let app: INestApplication;
  let request: TestAgent<supertest.Test>;

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

  it('should retrieve the event attributes', async () => {
    await request.post('/').send({ someAttribute: '🎁' }).expect(201, '🎁');
  });
});
