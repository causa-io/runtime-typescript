import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import {
  EntityAlreadyExistsFilter,
  EntityNotFoundFilter,
  GlobalFilter,
  IncorrectEntityVersionFilter,
} from './exceptions.filter.js';

/**
 * This module exposes exception filters for Causa-defined errors, as well as a global filter meant to catch all
 * unexpected errors and convert them to a generic `InternalServerError`.
 */
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalFilter,
    },
    {
      provide: APP_FILTER,
      useClass: EntityAlreadyExistsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: EntityNotFoundFilter,
    },
    {
      provide: APP_FILTER,
      useClass: IncorrectEntityVersionFilter,
    },
  ],
})
export class ExceptionFilterModule {}
