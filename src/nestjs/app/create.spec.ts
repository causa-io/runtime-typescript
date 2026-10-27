import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  type INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Transform } from 'class-transformer';
import { IsPhoneNumber } from 'class-validator';
import { PinoLogger } from 'nestjs-pino';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import { getLoggedObjects, spyOnLogger } from '../../logging/testing.js';
import { ConflictErrorDto } from '../errors/errors.dto.js';
import { throwHttpErrorResponse } from '../errors/http-error.js';
import { createApp } from './create.js';

class PostTestDto {
  @IsPhoneNumber()
  @Transform(({ value }) => `📞: ${value}`, { toPlainOnly: true })
  phoneNumber!: string;
}

@Controller('test')
class TestController {
  readonly someConfValue: string;

  constructor(
    readonly logger: PinoLogger,
    configService: ConfigService,
  ) {
    this.someConfValue = configService.getOrThrow('SOME_CONF_VALUE');
  }

  @Get('/')
  async get() {
    this.logger.info('💮');
    return;
  }

  @Get('/conflict')
  async throwAlreadyExist() {
    throwHttpErrorResponse(new ConflictErrorDto());
  }

  @Post('/')
  async validateBody(@Body() body: PostTestDto) {
    return body;
  }
}

@Module({ controllers: [TestController] })
class TestModule {}

@Module({
  imports: [TestModule],
})
class AppModule {}

@Module({
  imports: [TestModule],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
class AppModuleWithClassSerializer {}

describe('createApp', () => {
  let app: INestApplication;
  let previousEnv: NodeJS.ProcessEnv;
  let request: TestAgent<supertest.Test>;

  beforeEach(async () => {
    spyOnLogger();
    previousEnv = { ...process.env };
    process.env.SOME_CONF_VALUE = '🔧';
    app = await createApp(AppModule, {
      nestApplicationOptions: { cors: true },
      extraConfiguration: (app: NestExpressApplication) =>
        app.useBodyParser('json', { limit: 100 }),
    });
    request = supertest(app.getHttpServer());
  });

  afterEach(async () => {
    await app.close();
    process.env = previousEnv;
  });

  it('should not return the x-powered-by header', async () => {
    const actualResponse = await request.get('/test').expect(200);

    expect(actualResponse.headers).not.toHaveProperty('x-powered-by');
  });

  it('should import the business module', async () => {
    const actualController = app.get(TestController);

    expect(actualController).toBeInstanceOf(TestController);
  });

  it('should import the configuration module', async () => {
    const controller = app.get(TestController);

    const actualConfValue = controller.someConfValue;

    expect(actualConfValue).toEqual('🔧');
  });

  it('should expose the logger module', async () => {
    const controller = app.get(TestController);

    const actualLogger = controller.logger;
    await request.get('/test').expect(200);

    expect(actualLogger).toBeInstanceOf(PinoLogger);
    expect(getLoggedObjects({ predicate: (o) => o.message === '💮' })).toEqual([
      expect.objectContaining({
        req: expect.objectContaining({ url: '/test' }),
      }),
    ]);
  });

  it('should import the exception filter module', async () => {
    await request.get('/test/conflict').expect(409);
  });

  it('should import the validation module', async () => {
    await request
      .post('/test')
      .send({ forbidden: '🙅', phoneNumber: '📞' })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: 400,
          message: expect.stringContaining('phoneNumber'),
          errorCode: 'invalidInput',
          fields: expect.arrayContaining(['phoneNumber', 'forbidden']),
        });
      });
  });

  it('should not use class-transformer to serialize the response', async () => {
    await request
      .post('/test')
      .send({ phoneNumber: '+33600000000' })
      .expect(201, { phoneNumber: '+33600000000' });
  });

  it('should use the class serializer interceptor provided by the business module', async () => {
    const otherApp = await createApp(AppModuleWithClassSerializer);

    try {
      await supertest(otherApp.getHttpServer())
        .post('/test')
        .send({ phoneNumber: '+33600000000' })
        .expect(201, { phoneNumber: '📞: +33600000000' });
    } finally {
      await otherApp.close();
    }
  });

  it('should apply nest application options', async () => {
    const actualResponse = await request.get('/test').expect(200);

    expect(actualResponse.headers).toHaveProperty(
      'access-control-allow-origin',
      '*',
    );
  });

  it('should enforce extra configuration', async () => {
    await request
      .post('/test')
      .send({ phoneNumber: '📱'.repeat(100) })
      .expect(413);
  });
});
