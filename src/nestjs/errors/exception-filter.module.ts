import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalFilter } from './exceptions.filter.js';

/**
 * This module exposes a global exception filter meant to catch all unexpected errors and convert them to a generic
 * `InternalServerError`. `RetryableError`s will be converted to a `ServiceUnavailableError`.
 */
@Module({
  providers: [{ provide: APP_FILTER, useClass: GlobalFilter }],
})
export class ExceptionFilterModule {}
