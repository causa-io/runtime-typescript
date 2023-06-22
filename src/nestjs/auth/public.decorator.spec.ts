import { Reflector } from '@nestjs/core';
import 'jest-extended';
import { Public, PUBLIC_ROUTE_METADATA_KEY } from './public.decorator.js';

describe('Public', () => {
  class TestController {
    @Public()
    async testPublicRoute() {
      return;
    }

    async testPrivateRoute() {
      return;
    }
  }

  @Public()
  class TestPublicController {}

  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('should decorate a controller route', () => {
    const controller = new TestController();

    const actualIsPublic = reflector.get<boolean>(
      PUBLIC_ROUTE_METADATA_KEY,
      controller.testPublicRoute,
    );

    expect(actualIsPublic).toBeTrue();
  });

  it('should not be present by default', () => {
    const controller = new TestController();

    const actualIsPublic = reflector.get<boolean>(
      PUBLIC_ROUTE_METADATA_KEY,
      controller.testPrivateRoute,
    );

    expect(actualIsPublic).toBeFalsy();
  });

  it('should decorate an entire controller', () => {
    const actualIsPublic = reflector.get<boolean>(
      PUBLIC_ROUTE_METADATA_KEY,
      TestPublicController,
    );

    expect(actualIsPublic).toBeTrue();
  });
});
