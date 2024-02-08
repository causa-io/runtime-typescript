import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard, PassportModule, PassportStrategy } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Strategy } from 'passport-http-bearer';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import { User } from '../../auth/index.js';
import { AuthUser } from './auth-user.decorator.js';

@Controller('test')
class TestController {
  @Get()
  async testRoute(@AuthUser() user: User): Promise<User> {
    return user;
  }
}

class BearerStrategy extends PassportStrategy(Strategy) {
  validate(): User {
    return { id: 'user-1234', isAdmin: true };
  }
}

describe('AuthUser', () => {
  let app: INestApplication;
  let request: TestAgent<supertest.Test>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [TestController],
      providers: [
        { provide: APP_GUARD, useClass: AuthGuard('bearer') },
        BearerStrategy,
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    request = supertest(app.getHttpServer());
  });

  afterEach(async () => {
    await app?.close();
  });

  it('should set the controller method argument as the request user', async () => {
    await request
      .get('/test')
      .auth('my-token', { type: 'bearer' })
      .expect({ id: 'user-1234', isAdmin: true });
  });
});
