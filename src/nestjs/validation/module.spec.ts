import {
  Body,
  Controller,
  type INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { IsInt, IsPhoneNumber, MaxLength } from 'class-validator';
import supertest from 'supertest';
import TestAgent from 'supertest/lib/agent.js';
import {
  AllowMissing,
  IsNullable,
  ValidateNestedType,
} from '../../validation/index.js';
import { ExceptionFilterModule, createApp } from '../index.js';
import { ValidationModule } from './module.js';

class ChildDto {
  @MaxLength(3)
  shortString!: string;

  @AllowMissing()
  @IsInt({ each: true })
  array?: number[];
}

class Dto {
  @IsPhoneNumber()
  phoneNumber!: string;

  @ValidateNestedType(() => ChildDto)
  child!: ChildDto;

  @IsNullable()
  @ValidateNestedType(() => ChildDto)
  nullableChild!: ChildDto | null;

  @AllowMissing()
  @ValidateNestedType(() => ChildDto)
  children?: ChildDto[];

  @AllowMissing()
  @MaxLength(3)
  optionalString?: string;
}

@Controller('/')
class TestController {
  @Post('/validate')
  async validate(@Body() dto: Dto): Promise<string> {
    return dto.phoneNumber;
  }

  @Post('/checkNullsAndNoUndefined')
  async checkNullsAndNoUndefined(@Body() dto: Dto): Promise<string> {
    return 'array' in dto.child || dto.nullableChild !== null ? '❌' : '✅';
  }

  @Post('/checkTypesAndNoUndefined')
  async checkTypesAndNoUndefined(@Body() dto: Dto): Promise<string> {
    const objects = [dto, dto.child, ...(dto.children ?? [])];
    const hasUndefined = objects.some((o) =>
      Object.values(o).includes(undefined),
    );
    const hasTypes =
      dto instanceof Dto &&
      dto.child instanceof ChildDto &&
      !!dto.children?.every((c) => c instanceof ChildDto);
    return !hasUndefined && hasTypes ? '✅' : '❌';
  }
}

@Module({
  controllers: [TestController],
  imports: [ValidationModule, ExceptionFilterModule],
})
class MyModule {}

describe('object', () => {
  let app: INestApplication;
  let request: TestAgent<supertest.Test>;

  beforeAll(async () => {
    app = await createApp(MyModule);
    request = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 400 on validation issue', async () => {
    return request
      .post('/validate')
      .send({ phoneNumber: '📞', nullableChild: { shortString: '✅' } })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: 400,
          message:
            '- phoneNumber: phoneNumber must be a valid phone number\n- child: child should not be null or undefined',
          errorCode: 'invalidInput',
          fields: ['phoneNumber', 'child'],
        });
      });
  });

  it('should correctly format validation error for child properties', async () => {
    return request
      .post('/validate')
      .send({
        phoneNumber: '📞',
        child: { shortString: '💥💥💥💥' },
        nullableChild: { shortString: '✅' },
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: 400,
          message:
            '- phoneNumber: phoneNumber must be a valid phone number\n- child.shortString: shortString must be shorter than or equal to 3 characters',
          errorCode: 'invalidInput',
          fields: ['phoneNumber', 'child.shortString'],
        });
      });
  });

  it('should correctly format validation error for arrays', async () => {
    return request
      .post('/validate')
      .send({
        phoneNumber: '+33600000000',
        child: { shortString: '✅', array: [1, 2, 3.5] },
        nullableChild: { shortString: '✅' },
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: 400,
          message:
            '- child.array: each value in array must be an integer number',
          errorCode: 'invalidInput',
          fields: ['child.array'],
        });
      });
  });

  it('should not set missing values to undefined and handle nulls', async () => {
    return request
      .post('/checkNullsAndNoUndefined')
      .send({
        phoneNumber: '+33600000000',
        child: { shortString: '👍' },
        nullableChild: null,
      })
      .expect(201, '✅');
  });

  it('should keep the types of objects from which undefined properties are removed', async () => {
    return request
      .post('/checkTypesAndNoUndefined')
      .send({
        phoneNumber: '+33600000000',
        child: { shortString: '👍' },
        nullableChild: null,
        children: [{ shortString: '1' }, { shortString: '2', array: [2] }],
      })
      .expect(201, '✅');
  });

  it('should pass', async () => {
    return request
      .post('/validate')
      .send({
        phoneNumber: '+33600000000',
        child: { shortString: '✅' },
        nullableChild: { shortString: '✅' },
      })
      .expect(201);
  });
});
