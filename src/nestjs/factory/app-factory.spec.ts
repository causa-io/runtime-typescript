import {
  Body,
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transform } from 'class-transformer';
import { IsPhoneNumber } from 'class-validator';
import { PinoLogger } from 'nestjs-pino';
import supertest from 'supertest';
import { EntityAlreadyExistsError } from '../../errors/index.js';
import { getLoggedObjects, spyOnLogger } from '../../logging/testing.js';
import { createApp } from './app-factory.js';

class PostTestDto {
  @IsPhoneNumber()
  @Transform(({ value }) => `📞: ${value}`, { toPlainOnly: true })
  phoneNumber!: string;
}

@Controller('test')
class TestController {
  readonly someConfValue: string;

  constructor(readonly logger: PinoLogger, configService: ConfigService) {
    this.someConfValue = configService.getOrThrow('SOME_CONF_VALUE');
  }

  @Get('/')
  async get() {
    this.logger.info('💮');
    return;
  }

  @Get('/conflict')
  async throwAlreadyExist() {
    throw new EntityAlreadyExistsError({} as any, {});
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

describe('app-factory', () => {
  let app: INestApplication;
  let previousEnv: NodeJS.ProcessEnv;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(async () => {
    spyOnLogger();
    previousEnv = { ...process.env };
    process.env.SOME_CONF_VALUE = '🔧';
    app = await createApp(AppModule);
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

  it('should transform the response', async () => {
    return request
      .post('/test')
      .send({ phoneNumber: '+33600000000' })
      .expect(201, { phoneNumber: '📞: +33600000000' });
  });
});
