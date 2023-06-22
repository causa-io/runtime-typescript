import { Module } from '@nestjs/common';
import { MyController } from './controller.test.js';
import { generateOpenApiDocument } from './utils.test.js';

@Module({ controllers: [MyController] })
class MyModule {}

describe('OpenAPI', () => {
  it('should generate the OpenAPI specification', async () => {
    const actualDocument = await generateOpenApiDocument(MyModule);

    expect(actualDocument).toEqual({
      components: {
        schemas: {
          MyErrorDto: {
            properties: {
              statusCode: {
                description: 'The HTTP status code of the error.',
                const: 418,
                example: 418,
                type: 'number',
              },
              errorCode: {
                const: '🫖',
                description: 'An error identifier, as a string.',
                example: '🫖',
                type: 'string',
              },
              message: {
                description: 'A message describing the error.',
                type: 'string',
              },
            },
            required: expect.arrayContaining([
              'statusCode',
              'errorCode',
              'message',
            ]),
            type: 'object',
          },
          SubDto: {
            properties: {
              dateProp: {
                description: '📆',
                format: 'date-time',
                type: 'string',
              },
            },
            required: ['dateProp'],
            type: 'object',
          },
          MyResponseDto: {
            properties: {
              stringProp: { description: '📰', type: 'string' },
              intProp: { description: '1️⃣', type: 'number' },
              constProp: {
                const: '🧊',
                example: '🧊',
                type: 'string',
                description: '⛄',
              },
              subProp: {
                allOf: [{ $ref: '#/components/schemas/SubDto' }],
                description: '🧒',
              },
            },
            required: ['stringProp', 'constProp', 'subProp'],
            type: 'object',
          },
          NotFoundErrorDto: {
            properties: {
              errorCode: {
                const: 'notFound',
                example: 'notFound',
                type: 'string',
                description: 'An error identifier, as a string.',
              },
              statusCode: {
                description: 'The HTTP status code of the error.',
                const: 404,
                example: 404,
                type: 'number',
              },
              message: {
                type: 'string',
                description: 'A message describing the error.',
              },
            },
            required: expect.arrayContaining([
              'statusCode',
              'errorCode',
              'message',
            ]),
            type: 'object',
          },
        },
      },
      info: { contact: {}, description: '', title: '', version: '1.0.0' },
      openapi: '3.0.0',
      paths: {
        '/some/path': {
          get: {
            operationId: 'MyController_get',
            description: '🔨',
            summary: '',
            parameters: [
              {
                description: "The resource's UUID.",
                in: 'path',
                name: 'id',
                required: true,
                schema: { type: 'string', format: 'uuid' },
              },
              {
                description: 'The known version of the resource.',
                in: 'query',
                name: 'updatedAt',
                required: true,
                schema: { format: 'date-time', type: 'string' },
              },
            ],
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/MyResponseDto' },
                  },
                },
                description: '💡',
              },
              404: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/NotFoundErrorDto' },
                  },
                },
                description: '🔍',
              },
              418: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/MyErrorDto' },
                  },
                },
                description: '🚨',
              },
            },
          },
        },
      },
      servers: [],
      tags: [],
    });
  });
});
