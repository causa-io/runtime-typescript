import { Body, Controller, Post } from '@nestjs/common';
import { NestApplication } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsPhoneNumber,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import supertest from 'supertest';
import { AllowMissing } from '../../validation/index.js';
import { ExceptionFilterModule } from '../index.js';
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

  @Type(() => ChildDto)
  @ValidateNested()
  @IsDefined()
  child!: ChildDto;
}

@Controller('/')
class TestController {
  @Post('/validate')
  async validate(@Body() dto: Dto) {
    return dto.phoneNumber;
  }
}

describe('object', () => {
  let app: NestApplication;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ValidationModule, ExceptionFilterModule],
      controllers: [TestController],
    }).compile();
    app = module.createNestApplication();

    request = supertest(app.getHttpServer());
    await app.init();
  });

  it('should return 400 on validation issue', async () => {
    return request
      .post('/validate')
      .send({ phoneNumber: '📞' })
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
      .send({ phoneNumber: '📞', child: { shortString: '💥💥💥💥' } })
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

  it('should pass', async () => {
    return request
      .post('/validate')
      .send({ phoneNumber: '+33600000000', child: { shortString: '✅' } })
      .expect(201);
  });
});
