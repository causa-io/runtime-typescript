import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { RetryableError } from '../../errors/index.js';
import { EventAttributes, InvalidEventError } from '../../events/index.js';
import { ObjectSerializer } from '../../serialization/index.js';
import { ValidationError, validateObject } from '../../validation/index.js';
import { ServiceUnavailableError } from '../errors/index.js';
import { EVENT_BODY_TYPE_KEY } from './event-body.decorator.js';
import { RequestWithEvent } from './request-with-event.js';

/**
 * The intercepted request, parsed as event pushed to the endpoint.
 */
export type ParsedEventRequest = {
  /**
   * The body of the event.
   */
  body: Buffer;

  /**
   * Attributes sent along with the event.
   */
  attributes?: EventAttributes;
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
   * @param serializer The {@link ObjectSerializer} to use to deserialize the events.
   * @param reflector The {@link Reflector} to use to retrieve the event body type.
   * @param logger The logger to use.
   */
  constructor(
    protected readonly serializer: ObjectSerializer,
    protected readonly reflector: Reflector,
    protected readonly logger: PinoLogger,
  ) {}

  /**
   * Parses the event from the request.
   *
   * This should be implemented by subclasses. An {@link InvalidEventError} can be thrown if the message broker sends an
   * invalid event. In this case, it will not be retried. Any other error will not be caught.
   *
   * @param context The NestJS {@link ExecutionContext}.
   */
  protected abstract parseEventFromContext(
    context: ExecutionContext,
  ): Promise<ParsedEventRequest>;

  /**
   * Deserializes a buffer into the given event type, and validates it using {@link validateObject}.
   * During validation, non-whitelisted properties are not forbidden, as the event may contain additional properties
   * due to (compatible) schema changes. These properties are simply removed from the returned event.
   *
   * @param buffer The buffer to deserialize.
   * @param dataType The type of the event to deserialize.
   * @returns The deserialized event.
   */
  protected async deserializeEventBody(
    buffer: Buffer,
    dataType: Type,
  ): Promise<any> {
    try {
      const body = await this.serializer.deserialize(dataType, buffer);

      if (body.id) {
        this.logger.assign({ eventId: body.id });
      }

      await validateObject(body, {
        forbidNonWhitelisted: false,
      });

      this.logger.info('Successfully parsed event body.');

      return body;
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
    const request = context
      .switchToHttp()
      .getRequest<Request & RequestWithEvent>();

    const dataType = this.reflector.get(
      EVENT_BODY_TYPE_KEY,
      context.getHandler(),
    );
    if (dataType === undefined) {
      return next.handle();
    }

    try {
      const parsedEvent = await this.parseEventFromContext(context);
      request.eventBody = await this.deserializeEventBody(
        parsedEvent.body,
        dataType,
      );
      request.eventAttributes = parsedEvent.attributes ?? {};

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
              mergeMap(() => throwError(() => new ServiceUnavailableError())),
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
