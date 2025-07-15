import {
  type ArgumentsHost,
  Catch,
  HttpException,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { RetryableError } from '../../errors/index.js';
import {
  InternalServerErrorDto,
  ServiceUnavailableErrorDto,
} from './errors.dto.js';
import { makeHttpException } from './http-error.js';

/**
 * A filter that forwards {@link HttpException} subclasses (including `HttpError`) to the {@link BaseExceptionFilter},
 * and converts all unknown errors to a generic {@link InternalServerError}.
 */
@Catch()
export class GlobalFilter extends BaseExceptionFilter {
  private static readonly globalFilterLogger = new Logger('ExceptionsHandler');

  catch(exception: any, host: ArgumentsHost) {
    let converted: any;
    if (exception instanceof HttpException) {
      converted = exception;
    } else if (this.isHttpError(exception)) {
      converted = new HttpException(
        { statusCode: exception.statusCode, message: exception.message },
        exception.statusCode,
      );
    } else if (exception instanceof RetryableError) {
      converted = makeHttpException(new ServiceUnavailableErrorDto());

      const logObject = { error: exception?.stack };
      const message =
        'A retryable error was caught by the global exception filter.';
      GlobalFilter.globalFilterLogger.warn(logObject, message);
    } else {
      converted = makeHttpException(new InternalServerErrorDto());

      // All uncaught errors that don't inherit from `HttpException` will be converted to a generic
      // `InternalServerError`. This will disable the behavior in `BaseExceptionFilter.handleUnknownError`.
      // The following lines ensure the error is logged.
      const logObject = { error: exception?.stack };
      const message = exception?.message?.length
        ? exception.message
        : 'An unhandled error was caught by the global exception filter.';
      GlobalFilter.globalFilterLogger.error(logObject, message);
    }

    super.catch(converted, host);
  }
}
