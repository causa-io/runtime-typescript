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
import { AllowMissing } from '../../index.js';
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
});
