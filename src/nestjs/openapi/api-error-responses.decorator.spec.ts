import { Controller, Get, HttpStatus, Module } from '@nestjs/common';
import {
  ApiErrorDescription,
  ApiErrorResponses,
  ApiErrorStatusCode,
  ErrorDto,
} from '../index.js';
import { generateOpenApiDocument } from './utils.test.js';

@ApiErrorDescription('📚')
class MyError1Dto extends ErrorDto {
  @ApiErrorStatusCode(HttpStatus.I_AM_A_TEAPOT)
  readonly statusCode = HttpStatus.I_AM_A_TEAPOT;
}

@ApiErrorDescription('📙')
class MyError2Dto extends ErrorDto {
  @ApiErrorStatusCode(HttpStatus.BAD_REQUEST)
  readonly statusCode = HttpStatus.BAD_REQUEST;
}

@ApiErrorDescription('📗')
class MyError3Dto extends ErrorDto {
  @ApiErrorStatusCode(HttpStatus.BAD_REQUEST)
  readonly statusCode = HttpStatus.BAD_REQUEST;
}

@ApiErrorDescription('📕')
class MyError4Dto extends ErrorDto {
  @ApiErrorStatusCode(HttpStatus.NOT_FOUND)
  readonly statusCode = HttpStatus.NOT_FOUND;
}

@Controller()
@ApiErrorResponses(MyError1Dto)
class MyController {
  @Get()
  @ApiErrorResponses(MyError2Dto, MyError3Dto, MyError4Dto)
  get(): void {}
}

@Module({ controllers: [MyController] })
class MyModule {}

describe('ApiErrorResponses', () => {
  it('should document the endpoints', async () => {
    const actualDocument = await generateOpenApiDocument(MyModule);
    const actualGetPath = actualDocument.paths['/'].get;
    const actualSchemas = actualDocument.components?.schemas;

    expect(actualGetPath?.responses['400']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            oneOf: [
              { $ref: '#/components/schemas/MyError2Dto' },
              { $ref: '#/components/schemas/MyError3Dto' },
            ],
          },
        },
      },
      description: '- 📙\n- 📗',
    });
    expect(actualGetPath?.responses['404']).toMatchObject({
      content: {
        'application/json': {
          schema: { oneOf: [{ $ref: '#/components/schemas/MyError4Dto' }] },
        },
      },
      description: '📕',
    });
    expect(actualGetPath?.responses['418']).toMatchObject({
      content: {
        'application/json': {
          schema: { oneOf: [{ $ref: '#/components/schemas/MyError1Dto' }] },
        },
      },
      description: '📚',
    });
    expect(actualSchemas?.MyError1Dto).toMatchObject({
      type: 'object',
      properties: {
        statusCode: {
          examples: [418],
          const: 418,
          type: 'integer',
          description: expect.any(String),
        },
      },
      required: ['statusCode', 'message', 'errorCode'],
    });
    expect(actualSchemas?.MyError2Dto).toMatchObject({
      type: 'object',
      properties: {
        statusCode: {
          examples: [400],
          const: 400,
          type: 'integer',
          description: expect.any(String),
        },
      },
      required: ['statusCode', 'message', 'errorCode'],
    });
    expect(actualSchemas?.MyError3Dto).toMatchObject({
      type: 'object',
      properties: {
        statusCode: {
          examples: [400],
          const: 400,
          type: 'integer',
          description: expect.any(String),
        },
      },
      required: ['statusCode', 'message', 'errorCode'],
    });
    expect(actualSchemas?.MyError4Dto).toMatchObject({
      type: 'object',
      properties: {
        statusCode: {
          examples: [404],
          const: 404,
          type: 'integer',
          description: expect.any(String),
        },
      },
      required: ['statusCode', 'message', 'errorCode'],
    });
  });
});
