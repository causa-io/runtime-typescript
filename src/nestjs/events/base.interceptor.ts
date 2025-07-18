import {
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
  type Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { RetryableError } from '../../errors/index.js';
import { type EventAttributes, InvalidEventError } from '../../events/index.js';
import { ValidationError } from '../../validation/index.js';
import { ServiceUnavailableErrorDto } from '../errors/errors.dto.js';
import { makeHttpException } from '../errors/index.js';
import { Logger } from '../logging/index.js';
import { EVENT_BODY_TYPE_KEY } from './event-body.decorator.js';
import type { RequestWithEvent } from './request-with-event.js';
import { EVENT_HANDLER_KEY } from './use-event-handler.decorator.js';

/**
 * The intercepted request, parsed as event pushed to the endpoint.
 */
export type ParsedEventRequest = {
  /**
   * The parsed body of the event.
   */
  body: object;

  /**
   * Attributes sent along with the event.
   */
  attributes: EventAttributes;
};

/**
 * A base {@link NestInterceptor} meant to intercept requests coming from a message broker pushing events to an
 * endpoint.
 *
 * This base interceptor handles fetching the event body type set by the `EventBody` decorator, the deserialization of
 * the event once it has been extracted from the request, and the validation of the event.
 * Unknown errors thrown by the handler are caught, while retryable errors make the endpoint return a 503.
 * Subclasses should implement the {@link BaseEventHandlerInterceptor.parseEventFromContext} method to extract the event
 * from the request.
 */
export abstract class BaseEventHandlerInterceptor implements NestInterceptor {
  /**
   * Creates a new {@link BaseEventHandlerInterceptor}.
   *
   * @param id The unique ID of the interceptor.
   * @param reflector The {@link Reflector} to use to retrieve the event body type.
   * @param logger The logger to use.
   */
  constructor(
    readonly id: string,
    protected readonly reflector: Reflector,
    protected readonly logger: Logger,
  ) {
    this.logger.setContext(BaseEventHandlerInterceptor.name);
  }

  /**
   * Assigns the ID of the event to the logger.
   * Using this method ensures all interceptors log the event ID in the same way.
   *
   * @param id The ID of the event.
   */
  protected assignEventId(id: string) {
    this.logger.assign({ eventId: id });
  }

  /**
   * Parses the event from the request.
   *
   * This should be implemented by subclasses. An {@link InvalidEventError} can be thrown if the message broker sends an
   * invalid event. In this case, it will not be retried. Any other error will not be caught.
   * {@link BaseEventHandlerInterceptor.wrapParsing} should be used to catch any error during parsing and validation.
   * {@link BaseEventHandlerInterceptor.assignEventId} should be used to assign the event ID to the logger, as soon as
   *   it is known.
   *
   * @param context The NestJS {@link ExecutionContext}.
   * @param dataType The type of the event to parse, set by the `EventBody` decorator.
   *   The type is obtained using reflection. If not available, this will be {@link Object}.
   */
  protected abstract parseEventFromContext(
    context: ExecutionContext,
    dataType: Type,
  ): Promise<ParsedEventRequest>;

  /**
   * Wraps the parsing of the event body in a try/catch block.
   * If parsing fails, an error is logged and an {@link InvalidEventError} is thrown. This means the event processing
   * will not be retried (the parsing would keep failing).
   * This method also handles {@link ValidationError}s by logging the validation messages along with the error.
   *
   * @param parseFn The function parsing, validating, and returning the event body.
   * @returns The result of the parsing function.
   */
  protected async wrapParsing<T>(parseFn: () => Promise<T>): Promise<T> {
    try {
      const result = await parseFn();

      this.logger.info('Successfully parsed event body.');

      return result;
    } catch (error: any) {
      this.logger.error(
        {
          error: error.stack,
          ...(error instanceof ValidationError
            ? { validationMessages: error.validationMessages }
            : {}),
        },
        'Received an invalid event.',
      );

      throw new InvalidEventError();
    }
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const handlerId = this.reflector.getAllAndOverride<string | undefined>(
      EVENT_HANDLER_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (handlerId !== undefined && handlerId !== this.id) {
      return next.handle();
    }

    const dataType = this.reflector.get(
      EVENT_BODY_TYPE_KEY,
      context.getHandler(),
    );
    if (dataType === undefined) {
      return next.handle();
    }

    try {
      const parsedEvent = await this.parseEventFromContext(context, dataType);

      const request = context
        .switchToHttp()
        .getRequest<Request & RequestWithEvent>();
      request.eventBody = parsedEvent.body;
      request.eventAttributes = parsedEvent.attributes;

      return next.handle().pipe(
        catchError((error) => {
          if (error instanceof RetryableError) {
            this.logger.warn(
              { error: error.stack },
              error.message?.length
                ? error.message
                : 'A retryable error was thrown.',
            );
            return timer(error.delay ?? 0).pipe(
              mergeMap(() =>
                throwError(() =>
                  makeHttpException(new ServiceUnavailableErrorDto()),
                ),
              ),
            );
          }

          this.logger.error(
            { error: error.stack },
            error.message?.length
              ? error.message
              : 'Error during event processing.',
          );
          // During processing, any error other than a retryable error should not be returned to the broker, such that
          // the event processing is not retried.
          return of({});
        }),
      );
    } catch (error) {
      if (error instanceof InvalidEventError) {
        // If the event could not be parsed, retrying processing will not solve the problem.
        // No error should be returned to the broker.
        return of({});
      }

      throw error;
    }
  }
}
