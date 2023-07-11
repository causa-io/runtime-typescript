import {
  Controller,
  Get,
  INestApplication,
  Module,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumberString, IsString, IsUUID } from 'class-validator';
import 'jest-extended';
import 'reflect-metadata';
import supertest from 'supertest';
import { AllowMissing, IsDateType } from '../../validation/index.js';
import { createApp } from '../factory/index.js';
import { generateOpenApiDocument } from '../openapi/utils.test.js';
import { CustomReadAfterType } from './custom-read-after-type.decorator.js';
import { Page } from './page.js';
import { PageQuery } from './query.js';

class MyQuery extends PageQuery<string> {
  constructor(data?: Partial<MyQuery>) {
    super();
    Object.assign(this, { ...data });
  }

  @IsString()
  @AllowMissing()
  @ApiProperty({ description: '🔧', required: false })
  readonly otherValue?: string;

  @IsDateType()
  @AllowMissing()
  @ApiProperty({ description: '📆', required: false })
  readonly dateFilter?: Date;
}

class CustomKey {
  @IsNumberString()
  readonly someKeyValue!: string;

  @IsDateType()
  readonly date!: Date;
}

class MyComplexQuery extends PageQuery<CustomKey> {
  constructor(data?: Partial<MyQuery>) {
    super();
    Object.assign(this, { ...data });
  }

  @IsString()
  @AllowMissing()
  @ApiProperty({ description: '🔧', required: false })
  otherValue?: string;

  @CustomReadAfterType()
  declare readAfter?: CustomKey;
}

class MyEntity {
  constructor(data?: Partial<MyEntity>) {
    Object.assign(this, { id: '123', someProp: 1, ...data });
  }

  @IsUUID()
  @ApiProperty({ description: '🆔' })
  readonly id!: string;

  @IsInt()
  @ApiProperty({ description: '1️⃣' })
  readonly someProp!: number;
}

@Controller()
class MyController {
  @Get('/simple')
  @ApiOkResponse({ description: '📃', type: () => Page.of(MyEntity) })
  async getItems(@Query() query: MyQuery): Promise<Page<MyEntity, MyQuery>> {
    const count = query.otherValue === '📃' ? query.limit : 2;
    const start = query.readAfter ? parseInt(query.readAfter) + 1 : 0;
    const computedDate = query.dateFilter
      ? new Date(query.dateFilter.getTime() + 1000)
      : undefined;
    const items = [...Array(count)].map(
      (_, i) =>
        new MyEntity({
          id: `${start + i}`,
          someProp: computedDate?.getTime() ?? 0,
        }),
    );
    return new Page<MyEntity, MyQuery>(
      items,
      query.withMaxLimit(5),
      (i) => i.id,
    );
  }

  @Get('/complex')
  @ApiOkResponse({ description: '📃📄', type: () => Page.of(MyEntity) })
  async getItemsComplex(
    @Query() query: MyComplexQuery,
  ): Promise<Page<MyEntity, MyComplexQuery>> {
    return new Page<MyEntity, MyComplexQuery>(
      [
        new MyEntity({
          id: '0',
          someProp: query.readAfter?.date.getTime() ?? 0,
        }),
      ],
      query.withMaxLimit(5),
      (i) => ({ someKeyValue: i.id, date: new Date(i.someProp) }),
    );
  }
}

@Module({ controllers: [MyController] })
class MyModule {}

describe('Page', () => {
  describe('constructor', () => {
    it('should create an empty page', () => {
      const actualPage = new Page([], new MyQuery().withMaxLimit(1));

      expect(actualPage.items).toBeEmpty();
      expect(actualPage.nextPageQuery).toBeNull();
    });

    it('should set the next page query', () => {
      const pageQuery = new MyQuery({ otherValue: '🔎' }).withMaxLimit(2);
      const item1 = new MyEntity({ id: '123' });
      const item2 = new MyEntity({ id: '124' });

      const actualPage = new Page([item1, item2], pageQuery);

      expect(actualPage.items).toHaveLength(2);
      expect(actualPage.nextPageQuery).toBeInstanceOf(MyQuery);
      expect(actualPage.nextPageQuery).toEqual({
        readAfter: item2.id,
        limit: pageQuery.limit,
        otherValue: pageQuery.otherValue,
      });
    });

    it('should not set the next page query', () => {
      const pageQuery = new MyQuery().withMaxLimit(10);

      const actualPage = new Page([new MyEntity()], pageQuery);

      expect(actualPage.items).toHaveLength(1);
      expect(actualPage.nextPageQuery).toBeNull();
    });

    it('should use the provided key resolver', async () => {
      const item = new MyEntity();
      const expectedDate = new Date();

      const actualPage = new Page(
        [item],
        new MyComplexQuery().withMaxLimit(1),
        (i) => ({ someKeyValue: i.id, date: expectedDate }),
      );

      expect(actualPage.nextPageQuery).toBeInstanceOf(MyComplexQuery);
      expect(actualPage.nextPageQuery).toEqual({
        limit: 1,
        readAfter: { someKeyValue: item.id, date: expectedDate },
      });
    });
  });

  describe('serialization', () => {
    let app: INestApplication;
    let request: supertest.SuperTest<supertest.Test>;

    beforeEach(async () => {
      app = await createApp(MyModule);
      request = supertest(app.getHttpServer());
    });

    afterEach(async () => {
      await app?.close();
    });

    it('it should serialize and return the page', async () => {
      await request.get('/simple').expect(200, {
        items: [
          { id: '0', someProp: 0 },
          { id: '1', someProp: 0 },
        ],
        nextPageQuery: null,
      });
    });

    it('should serialize the next page query', async () => {
      const date = new Date();
      const expectedDateTime = date.getTime() + 1000;

      await request
        .get('/simple')
        .query({
          limit: 2,
          readAfter: '1',
          otherValue: '📃',
          dateFilter: date.toISOString(),
        })
        .expect(200, {
          items: [
            { id: '2', someProp: expectedDateTime },
            { id: '3', someProp: expectedDateTime },
          ],
          nextPageQuery: `?limit=2&readAfter=3&otherValue=%F0%9F%93%83&dateFilter=${encodeURIComponent(
            date.toISOString(),
          )}`,
        });
    });

    it('should validate the input query', async () => {
      await request.get('/simple').query({ limit: '1️⃣' }).expect(400);
    });

    it('should parse a complex key type', async () => {
      const date = new Date();

      await request
        .get('/complex')
        .query({
          limit: 1,
          readAfter: Buffer.from(
            JSON.stringify({ someKeyValue: '1', date }),
          ).toString('base64'),
          otherValue: '📃',
        })
        .expect(200, {
          items: [{ id: '0', someProp: date.getTime() }],
          nextPageQuery: `?limit=1&readAfter=${Buffer.from(
            JSON.stringify({ someKeyValue: '0', date }),
          ).toString('base64')}&otherValue=%F0%9F%93%83`,
        });
    });
  });

  describe('OpenAPI', () => {
    it('should generate the OpenAPI schema', async () => {
      const actualDocument = await generateOpenApiDocument(MyModule);

      expect(actualDocument).toEqual({
        components: {
          schemas: {
            MyEntity: {
              properties: {
                id: { description: '🆔', type: 'string' },
                someProp: { description: '1️⃣', type: 'number' },
              },
              required: ['id', 'someProp'],
              type: 'object',
            },
            PageOfMyEntity: {
              properties: {
                nextPageQuery: {
                  description:
                    'The query to make to fetch the next page of results.',
                  type: 'string',
                  nullable: true,
                },
                items: {
                  description: 'The items in the current page.',
                  type: 'array',
                  items: { $ref: '#/components/schemas/MyEntity' },
                },
              },
              required: ['nextPageQuery', 'items'],
              type: 'object',
            },
          },
        },
        info: { contact: {}, description: '', title: '', version: '1.0.0' },
        openapi: '3.0.0',
        paths: {
          '/complex': {
            get: {
              operationId: 'MyController_getItemsComplex',
              parameters: [
                {
                  description: 'The maximum number of returned results.',
                  in: 'query',
                  name: 'limit',
                  required: false,
                  schema: { type: 'number' },
                },
                {
                  description:
                    'The token to pass when fetching the next page of results. Provided by the previous query response.',
                  in: 'query',
                  name: 'readAfter',
                  required: false,
                  schema: { type: 'string' },
                },
                {
                  description: '🔧',
                  in: 'query',
                  name: 'otherValue',
                  required: false,
                  schema: { type: 'string' },
                },
              ],
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/PageOfMyEntity' },
                    },
                  },
                  description: '📃📄',
                },
              },
            },
          },
          '/simple': {
            get: {
              operationId: 'MyController_getItems',
              parameters: [
                {
                  description: 'The maximum number of returned results.',
                  in: 'query',
                  name: 'limit',
                  required: false,
                  schema: { type: 'number' },
                },
                {
                  description:
                    'The token to pass when fetching the next page of results. Provided by the previous query response.',
                  in: 'query',
                  name: 'readAfter',
                  required: false,
                  schema: { type: 'string' },
                },
                {
                  description: '🔧',
                  in: 'query',
                  name: 'otherValue',
                  required: false,
                  schema: { type: 'string' },
                },
                {
                  description: '📆',
                  in: 'query',
                  name: 'dateFilter',
                  required: false,
                  schema: { type: 'string', format: 'date-time' },
                },
              ],
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/PageOfMyEntity' },
                    },
                  },
                  description: '📃',
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
});
