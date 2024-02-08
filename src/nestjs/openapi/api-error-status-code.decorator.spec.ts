import { HttpStatus } from '@nestjs/common';
import { ErrorDto } from '../errors/index.js';
import {
  ApiErrorStatusCode,
  getApiErrorStatusCode,
} from './api-error-status-code.decorator.js';
import {
  generateOpenApiDocument,
  makeModuleWithResponseDto,
} from './utils.test.js';

describe('ApiErrorStatusCode', () => {
  it('should store the status code', () => {
    class MyErrorDto extends ErrorDto {
      @ApiErrorStatusCode(HttpStatus.BAD_REQUEST)
      readonly statusCode = HttpStatus.BAD_REQUEST as const;
    }

    const actualStatusCode = getApiErrorStatusCode(MyErrorDto);

    expect(actualStatusCode).toEqual(400);
  });

  it('should throw an error if no status code is found', () => {
    class MyErrorDto extends ErrorDto {
      readonly statusCode = HttpStatus.BAD_REQUEST as const;
    }

    expect(() => getApiErrorStatusCode(MyErrorDto)).toThrow(
      `No API error status code found for 'MyErrorDto'.`,
    );
  });

  it('should decorate the property with ApiConstantProperty', async () => {
    class MyErrorDto extends ErrorDto {
      @ApiErrorStatusCode(HttpStatus.BAD_REQUEST)
      readonly statusCode = HttpStatus.BAD_REQUEST as const;
    }
    const testModule = makeModuleWithResponseDto(MyErrorDto);

    const actualDocument = await generateOpenApiDocument(testModule);

    expect(actualDocument.components?.schemas?.MyErrorDto).toMatchObject({
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
  });
});
