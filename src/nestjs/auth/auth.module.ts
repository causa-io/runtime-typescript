import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { BearerAuthGuard } from './bearer-auth.guard.js';
import { UserClaimsGuard } from './user-claims.guard.js';

/**
 * A module that can be imported to activate authentication and authorization on all routes of an application.
 * Routes can be made public using the `Public` decorator.
 * While this imports the global Passport logic, it does not provide any Passport strategy. A strategy specific to the
 * authentication provider must be imported separately.
 */
@Module({
  imports: [PassportModule],
  providers: [
    { provide: APP_GUARD, useClass: BearerAuthGuard },
    { provide: APP_GUARD, useClass: UserClaimsGuard },
  ],
})
export class AuthModule {}
