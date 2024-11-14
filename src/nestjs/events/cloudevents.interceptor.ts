import {
  type ExecutionContext,
  Injectable,
  type RawBodyRequest,
  type Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PinoLogger } from 'nestjs-pino';
import rawBody from 'raw-body';
import type { EventAttributes } from '../../events/index.js';
import type { ObjectSerializer } from '../../serialization/index.js';
import {
  BaseEventHandlerInterceptor,
  type ParsedEventRequest,
} from './base.interceptor.js';

/**
 * The ID of the CloudEvents event handler interceptor, that can be passed to the `UseEventHandler` decorator.
 */
export const CLOUDEVENTS_EVENT_HANDLER_ID = 'cloudEvents';

/**
 * The prefix for CloudEvents headers in HTTP requests.
 */
const CLOUDEVENTS_HTTP_HEADER_PREFIX = 'ce-';

/**
 * The interceptor that should be added to controllers handling CloudEvents events.
 * Request bodies are deserialized using the provided {@link ObjectSerializer}.
 * CloudEvents attributes are parsed from `ce-*` headers and set as the event attributes.
 * They can be retrieved using the `@EventAttributes` decorator.
 */
@Injectable()
export class CloudEventsEventHandlerInterceptor extends BaseEventHandlerInterceptor {
  /**
   * Creates a new {@link CloudEventsEventHandlerInterceptor}.
   * Do not use this constructor directly, use `CloudEventsEventHandlerInterceptor.withSerializer()` instead, either
   * with `APP_INTERCEPTOR` or `UseInterceptors`.
   *
   * @param serializer The serializer to use to deserialize the event from the request body.
   * @param reflector The {@link Reflector} to use.
   * @param logger The {@link PinoLogger} to use.
   */
  constructor(
    protected readonly serializer: ObjectSerializer,
    reflector: Reflector,
    logger: PinoLogger,
  ) {
    super(CLOUDEVENTS_EVENT_HANDLER_ID, reflector, logger);
  }

  /**
   * Extracts CloudEvent attributes as {@link EventAttributes} from the request headers.
   * Only headers starting with `ce-` are kept.
   *
   * @param request The request to parse the attributes from.
   * @returns The {@link EventAttributes}.
   */
  private parseAttributes(request: Request): EventAttributes {
    return Object.fromEntries(
      Object.entries(request.headers).flatMap(([key, value]) => {
        if (!key.startsWith(CLOUDEVENTS_HTTP_HEADER_PREFIX)) {
          return [];
        }

        if (!(typeof value === 'string')) {
          return [];
        }

        return [[key.slice(CLOUDEVENTS_HTTP_HEADER_PREFIX.length), value]];
      }),
    );
  }

  protected async parseEventFromContext(
    context: ExecutionContext,
    dataType: Type,
  ): Promise<ParsedEventRequest> {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();

    const attributes = this.parseAttributes(request);
    if (attributes.id) {
      this.assignEventId(attributes.id);
    }

    return await this.wrapParsing(async () => {
      let buffer: Buffer;
      if (request.readable) {
        buffer = await rawBody(request);
      } else if (request.rawBody) {
        buffer = request.rawBody;
      } else {
        throw new Error(
          'Failed to get request body as buffer. Make sure that the body is not consumed before the interceptor, or to set `rawBody: true`.',
        );
      }

      const body = await this.serializer.deserialize(dataType, buffer);

      return { attributes, body };
    });
  }

  /**
   * Returns a `CloudEventsEventHandlerInterceptor` class that uses the provided {@link ObjectSerializer}.
   * This can be used with the `UseInterceptors` decorator.
   *
   * @param serializer The {@link ObjectSerializer} to use to deserialize the event data.
   * @returns A class that can be used as an interceptor for CloudEvents event handlers.
   */
  static withSerializer(
    serializer: ObjectSerializer,
  ): Type<CloudEventsEventHandlerInterceptor> {
    @Injectable()
    class CloudEventEventHandlerInterceptorWithSerializer extends CloudEventsEventHandlerInterceptor {
      constructor(reflector: Reflector, logger: PinoLogger) {
        super(serializer, reflector, logger);
      }
    }

    return CloudEventEventHandlerInterceptorWithSerializer;
  }
}
