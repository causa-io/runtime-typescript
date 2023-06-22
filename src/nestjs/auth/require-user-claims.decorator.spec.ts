import { Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import 'jest-extended';
import {
  RequireUserClaims,
  USER_CLAIM_REQUIREMENTS_KEY,
} from './require-user-claims.decorator.js';

describe('RequireUserClaims', () => {
  class TestController {
    @Get()
    @RequireUserClaims({ role: '🦸' })
    async test() {
      return;
    }

    @Get('other')
    async otherRoute() {
      return;
    }
  }

  @RequireUserClaims({ role: '🛂' })
  class TestController2 {}

  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('should decorate a controller route', () => {
    const controller = new TestController();

    const actualRequirements = reflector.get<boolean>(
      USER_CLAIM_REQUIREMENTS_KEY,
      controller.test,
    );

    expect(actualRequirements).toEqual({ role: '🦸' });
  });

  it('should not be present by default', () => {
    const controller = new TestController();

    const actualRequirements = reflector.get<boolean>(
      USER_CLAIM_REQUIREMENTS_KEY,
      controller.otherRoute,
    );

    expect(actualRequirements).toBeUndefined();
  });

  it('should decorate an entire controller', () => {
    const actualRequirements = reflector.get<boolean>(
      USER_CLAIM_REQUIREMENTS_KEY,
      TestController2,
    );

    expect(actualRequirements).toEqual({ role: '🛂' });
  });
});
