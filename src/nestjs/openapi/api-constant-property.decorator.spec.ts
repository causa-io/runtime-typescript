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
          examples: ['🗽'],
          type: 'string',
        },
      },
      required: ['myProp'],
    });
  });

  it('should set the correct type for a number value', async () => {
    class MyDto {
      @ApiConstantProperty({ const: 123.456, description: '➗' })
      myProp!: 123.456;
    }
    const testModule = makeModuleWithResponseDto(MyDto);

    const actualDocument = await generateOpenApiDocument(testModule);

    expect(actualDocument.components?.schemas?.MyDto).toMatchObject({
      type: 'object',
      properties: {
        myProp: {
          examples: [123.456],
          const: 123.456,
          type: 'number',
          description: '➗',
        },
      },
      required: ['myProp'],
    });
  });

  it('should set the type to integer for an integer value', async () => {
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
          examples: [400],
          const: 400,
          type: 'integer',
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
        properties: {},
      })
      myProp!: { someComplexStuff: '🤷' };
    }

    const testModule = makeModuleWithResponseDto(MyDto);

    const actualDocument = await generateOpenApiDocument(testModule);

    expect(actualDocument.components?.schemas?.MyDto).toMatchObject({
      type: 'object',
      properties: {
        myProp: {
          examples: [{ someComplexStuff: '🤷' }],
          const: { someComplexStuff: '🤷' },
          type: 'object',
          description: '📚',
          properties: {},
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
    }).toThrow();
  });
});
