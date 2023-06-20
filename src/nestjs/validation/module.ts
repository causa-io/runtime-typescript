import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from './pipe.js';

/**
 * The module that exposes the validation pipe.
 */
@Module({
  providers: [{ provide: APP_PIPE, useValue: new ValidationPipe() }],
})
export class ValidationModule {}
