import { ApiConstantProperty } from './api-constant-property.decorator.js';
import {
  generateOpenApiDocument,
  makeModuleWithResponseDto,
} from './utils.test.js';

describe('ApiConstantProperty', () => {
  it('should return the base ApiProperty decorator', async () => {
    class MyDto {
      @ApiConstantProperty({ const: '🗽', description: '📚' })
      myProp!: '🗽';
    }
    const testModule = makeModuleWithResponseDto(MyDto);

    const actualDocument = await generateOpenApiDocument(testModule);

    expect(actualDocument.components?.schemas?.MyDto).toMatchObject({
      type: 'object',
      properties: {
        myProp: {
          const: '🗽',
          description: '📚',
          example: '🗽',
          type: 'string',
        },
      },
      required: ['myProp'],
    });
  });

  it('should set the correct type for a number value', async () => {
    class MyDto {
      @ApiConstantProperty({ const: 400, description: '➗' })
      myProp!: 400;
    }
    const testModule = makeModuleWithResponseDto(MyDto);

    const actualDocument = await generateOpenApiDocument(testModule);

    expect(actualDocument.components?.schemas?.MyDto).toMatchObject({
      type: 'object',
      properties: {
        myProp: {
          example: 400,
          const: 400,
          type: 'number',
          description: '➗',
        },
      },
      required: ['myProp'],
    });
  });

  it('should allow overriding the type', async () => {
    class MyDto {
      @ApiConstantProperty({
        const: { someComplexStuff: '🤷' },
        description: '📚',
        type: 'object',
      })
      myProp!: { someComplexStuff: '🤷' };
    }

    const testModule = makeModuleWithResponseDto(MyDto);

    const actualDocument = await generateOpenApiDocument(testModule);

    expect(actualDocument.components?.schemas?.MyDto).toMatchObject({
      type: 'object',
      properties: {
        myProp: {
          example: { someComplexStuff: '🤷' },
          const: { someComplexStuff: '🤷' },
          type: 'object',
          description: '📚',
        },
      },
      required: ['myProp'],
    });
  });

  it('should throw for an unhandled type', () => {
    expect(() => {
      ApiConstantProperty({
        const: { someComplexStuff: '🤷' },
        description: '💣',
      });
    }).toThrowError();
  });
});
