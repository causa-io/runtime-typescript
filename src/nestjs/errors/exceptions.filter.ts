import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import {
  EntityAlreadyExistsError,
  EntityNotFoundError,
  IncorrectEntityVersionError,
  RetryableError,
} from '../../errors/index.js';
import {
  ConflictError,
  IncorrectVersionError,
  InternalServerError,
  NotFoundError,
  ServiceUnavailableError,
} from './errors.dto.js';

/**
 * A filter that converts {@link EntityNotFoundError}s to {@link NotFoundError}s.
 */
@Catch(EntityNotFoundError)
export class EntityNotFoundFilter extends BaseExceptionFilter {
  catch(_: EntityNotFoundError, host: ArgumentsHost) {
    super.catch(new NotFoundError(), host);
  }
}

/**
 * A filter that converts {@link EntityAlreadyExistsError}s to {@link ConflictError}s.
 */
@Catch(EntityAlreadyExistsError)
export class EntityAlreadyExistsFilter extends BaseExceptionFilter {
  catch(_: EntityAlreadyExistsError, host: ArgumentsHost) {
    super.catch(new ConflictError(), host);
  }
}

/**
 * A filter that converts {@link IncorrectEntityVersionError}s to {@link IncorrectVersionError}s.
 */
@Catch(IncorrectEntityVersionError)
export class IncorrectEntityVersionFilter extends BaseExceptionFilter {
  catch(_: IncorrectEntityVersionError, host: ArgumentsHost) {
    super.catch(new IncorrectVersionError(), host);
  }
}

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
      converted = new ServiceUnavailableError();

      const logObject = { error: exception?.stack };
      const message =
        'A retryable error was caught by the global exception filter.';
      GlobalFilter.globalFilterLogger.warn(logObject, message);
    } else {
      converted = new InternalServerError();

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
