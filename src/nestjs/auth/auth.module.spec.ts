import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import { User } from '../../auth/index.js';
import { createApp } from '../factory/index.js';
import { makeTestAppFactory } from '../factory/testing.js';
import { AuthModule } from './auth.module.js';
import { RequireUserClaims } from './require-user-claims.decorator.js';

@Controller('test')
class TestController {
  @Get()
  @RequireUserClaims({ isAdmin: true })
  async get() {
    return;
  }
}

@Module({ controllers: [TestController] })
class BusinessModule {}

class BearerStrategy extends PassportStrategy(Strategy) {
  async validate(token: string): Promise<User> {
    return { id: 'user-1234', isAdmin: token === 'isAdmin' };
  }
}

@Module({ providers: [BearerStrategy] })
class TestAuthStrategyModule {}

@Module({ imports: [BusinessModule, TestAuthStrategyModule, AuthModule] })
class AppModule {}

describe('AuthModule', () => {
  let app: INestApplication;
  let request: TestAgent<supertest.Test>;

  beforeEach(async () => {
    app = await createApp(AppModule, {
      appFactory: makeTestAppFactory(),
    });
    request = supertest(app.getHttpServer());
  });

  it('should use the provided passport strategy and protect routes', async () => {
    await request.get('/test').expect(401);
    await request
      .get('/test')
      .auth('isNotAdmin', { type: 'bearer' })
      .expect(403);
    await request.get('/test').auth('isAdmin', { type: 'bearer' }).expect(200);
  });
});
