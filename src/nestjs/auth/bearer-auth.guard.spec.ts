import { jest } from '@jest/globals';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Strategy } from 'passport-http-bearer';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import { BearerAuthGuard } from './bearer-auth.guard.js';
import { Public } from './public.decorator.js';

@Controller('test')
class TestController {
  @Public()
  @Get('/public')
  async publicRoute() {
    return;
  }

  @Get('/private')
  async protectedRoute() {
    return;
  }
}

@Controller('public')
@Public()
class PublicController {
  @Get()
  async publicRoute() {
    return;
  }
}

class BearerStrategy extends PassportStrategy(Strategy) {
  async validate(token: string): Promise<any> {
    return token;
  }
}

describe('BearerAuthGuard', () => {
  let app: INestApplication;
  let request: TestAgent<supertest.Test>;
  let validateSpy: jest.SpiedFunction<typeof BearerStrategy.prototype.validate>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [TestController, PublicController],
      providers: [
        { provide: APP_GUARD, useClass: BearerAuthGuard },
        BearerStrategy,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    request = supertest(app.getHttpServer());

    validateSpy = jest.spyOn(BearerStrategy.prototype, 'validate');
  });

  afterEach(async () => {
    await app.close();
  });

  it('should allow a request without bearer token when the method is declared as public', async () => {
    await request.get('/test/public').expect(200);

    expect(validateSpy).not.toHaveBeenCalled();
  });

  it('should allow a request without bearer token when the controller is declared as public', async () => {
    await request.get('/public').expect(200);

    expect(validateSpy).not.toHaveBeenCalled();
  });

  it('should not allow a request without bearer token when the route is declared as private', async () => {
    await request.get('/test/private').expect(401);
  });

  it('should allow a request with a bearer token when the method is declared as public', async () => {
    await request
      .get('/test/public')
      .auth('my-token', { type: 'bearer' })
      .expect(200);

    expect(validateSpy).not.toHaveBeenCalled();
  });

  it('should allow a request with a bearer token when the controller is declared as public', async () => {
    await request
      .get('/public')
      .auth('my-token', { type: 'bearer' })
      .expect(200);

    expect(validateSpy).not.toHaveBeenCalled();
  });

  it('should allow a request with a bearer token when the method is declared as private', async () => {
    await request
      .get('/test/private')
      .auth('my-token', { type: 'bearer' })
      .expect(200);

    expect(validateSpy).toHaveBeenCalledWith('my-token', expect.anything());
  });
});
