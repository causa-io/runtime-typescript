import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Strategy } from 'passport-http-bearer';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import { User } from '../../auth/index.js';
import { BearerAuthGuard } from './bearer-auth.guard.js';
import { RequireUserClaims } from './require-user-claims.decorator.js';
import { UserClaimsGuard } from './user-claims.guard.js';

@Controller()
class TestController {
  @Get('/withRequirements')
  @RequireUserClaims({ isAdmin: true })
  async withRequirements() {
    return;
  }

  @Get('/withoutRequirements')
  async withoutRequirements() {
    return;
  }
}

class BearerStrategy extends PassportStrategy(Strategy) {
  async validate(token: string): Promise<User> {
    return { id: 'user-1234', isAdmin: token === 'isAdmin' };
  }
}

describe('UserClaimsGuard', () => {
  let app: INestApplication;
  let request: TestAgent<supertest.Test>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [TestController],
      providers: [
        { provide: APP_GUARD, useClass: BearerAuthGuard },
        { provide: APP_GUARD, useClass: UserClaimsGuard },
        BearerStrategy,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    request = supertest(app.getHttpServer());
  });

  afterEach(async () => {
    await app.close();
  });

  it('should allow access to a route without requirements', async () => {
    await request
      .get('/withoutRequirements')
      .auth('ok', { type: 'bearer' })
      .expect(200);
  });

  it('should allow access to a route with requirements if the user satisfies them', async () => {
    await request
      .get('/withRequirements')
      .auth('isAdmin', { type: 'bearer' })
      .expect(200);
  });

  it('should deny access to a route with requirements if the user does not satisfy them', async () => {
    await request
      .get('/withRequirements')
      .auth('isNotAdmin', { type: 'bearer' })
      .expect(403);
  });
});
