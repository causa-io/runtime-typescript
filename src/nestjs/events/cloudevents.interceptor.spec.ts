import {
  Controller,
  type INestApplication,
  Module,
  type NestApplicationOptions,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import 'jest-extended';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import type { EventAttributes } from '../../events/index.js';
import { JsonObjectSerializer } from '../../serialization/index.js';
import { getLoggedErrors, getLoggedInfos, spyOnLogger } from '../../testing.js';
import { createApp } from '../app/index.js';
import { Logger } from '../logging/index.js';
import { CloudEventsEventHandlerInterceptor } from './cloudevents.interceptor.js';
import { EventAttributes as EventAttributesDecorator } from './event-attributes.decorator.js';
import { EventBody } from './event-body.decorator.js';

class EventData {
  @IsString()
  readonly prop!: string;
}

@Controller()
class MyController {
  constructor(private readonly logger: Logger) {}

  @Post()
  @UseInterceptors(
    CloudEventsEventHandlerInterceptor.withSerializer(
      new JsonObjectSerializer(),
    ),
  )
  async post(
    @EventBody() data: EventData,
    @EventAttributesDecorator() attributes: EventAttributes,
  ): Promise<void> {
    this.logger.info({ data, attributes }, '📫');
  }
}

@Module({ controllers: [MyController] })
class MyModule {}

describe('CloudEventsEventHandlerInterceptor', () => {
  let app: INestApplication;
  let request: TestAgent<supertest.Test>;

  beforeAll(async () => {
    spyOnLogger();
  });

  afterAll(async () => {
    await app?.close();
  });

  async function createAppAndRequest(
    nestApplicationOptions?: NestApplicationOptions,
  ): Promise<void> {
    app = await createApp(MyModule, { nestApplicationOptions });
    request = supertest(app.getHttpServer());
  }

  function expectReceivedEvent(data: EventData, attributes: EventAttributes) {
    expect(getLoggedInfos({ predicate: (o) => o.message === '📫' })).toEqual([
      expect.objectContaining({ data, attributes }),
    ]);
  }

  function expectNoReceivedEvent() {
    expect(
      getLoggedInfos({ predicate: (o) => o.message === '📫' }),
    ).toBeEmpty();
  }

  it('should parse the event data and attributes by reading the body', async () => {
    await createAppAndRequest({ bodyParser: false });

    await request
      .post('/')
      .set('ce-id', '123')
      .set('ce-type', 'test')
      .set('not-expected', '123')
      .send({ prop: '💻' })
      .expect(201);

    expectReceivedEvent({ prop: '💻' }, { id: '123', type: 'test' });
  });

  it('should parse the event data and attributes by getting the rawBody of a consumed request', async () => {
    await createAppAndRequest({ rawBody: true });

    await request
      .post('/')
      .set('ce-id', '123')
      .set('ce-type', 'test')
      .send({ prop: '💻' })
      .expect(201);

    expectReceivedEvent({ prop: '💻' }, { id: '123', type: 'test' });
  });

  it('should log an error when the event body cannot be obtained', async () => {
    await createAppAndRequest();

    await request
      .post('/')
      .set('ce-id', '123')
      .set('ce-type', 'test')
      .send({ prop: '💻' })
      .expect(201);

    expectNoReceivedEvent();
    expect(getLoggedErrors()).toEqual([
      expect.objectContaining({
        message: 'Received an invalid event.',
        error: expect.stringContaining('Failed to get request body as buffer.'),
      }),
    ]);
  });
});
