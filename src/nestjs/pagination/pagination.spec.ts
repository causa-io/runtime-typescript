import {
  Controller,
  Get,
  INestApplication,
  Module,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNumberString,
  IsString,
  IsUUID,
} from 'class-validator';
import 'jest-extended';
import 'reflect-metadata';
import supertest from 'supertest';
import { AllowMissing } from '../../index.js';
import { createApp } from '../factory/index.js';
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
  readonly otherValue?: string;

  @IsDate()
  @Type(() => Date)
  @AllowMissing()
  readonly dateFilter?: Date;
}

class CustomKey {
  @IsNumberString()
  readonly someKeyValue!: string;

  @Type(() => Date)
  @IsDate()
  readonly date!: Date;
}

class MyComplexQuery extends PageQuery<CustomKey> {
  constructor(data?: Partial<MyQuery>) {
    super();
    Object.assign(this, { ...data });
  }

  @IsString()
  @AllowMissing()
  otherValue?: string;

  @CustomReadAfterType()
  declare readAfter?: CustomKey;
}

class MyEntity {
  constructor(data?: Partial<MyEntity>) {
    Object.assign(this, { id: '123', someProp: 1, ...data });
  }

  @IsUUID()
  readonly id!: string;

  @IsInt()
  readonly someProp!: number;
}

@Controller()
class MyController {
  @Get('/simple')
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
});
