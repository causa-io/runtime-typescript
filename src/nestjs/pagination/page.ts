import type { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, instanceToPlain, plainToInstance } from 'class-transformer';
import { PageQuery, type WithLimit } from './query.js';

/**
 * Converts a {@link PageQuery} object to a search params string, e.g. `?limit=10&readAfter=abc`.
 *
 * @param query The query to convert to a search params string.
 * @returns The search params string, or `null` if the query is `null`.
 */
function convertQueryToSearchParams(query: PageQuery | null): string | null {
  if (!query) {
    return query;
  }

  const plainQueryObject = instanceToPlain(query);
  // This removes undefined values and ensures the object only contains basic types.
  // Amongst others, dates will be converted to ISO strings.
  const serializedValues = JSON.parse(JSON.stringify(plainQueryObject));
  const params = new URLSearchParams(serializedValues);
  return `?${params.toString()}`;
}

/**
 * A generic page of items, along with the query to fetch the next page of results.
 */
export class Page<T, PQ extends PageQuery<any> = PageQuery> {
  /**
   * The query to make to fetch the next page of results.
   */
  @Transform(({ value }) => convertQueryToSearchParams(value), {
    toPlainOnly: true,
  })
  @ApiProperty({
    description: 'The query to make to fetch the next page of results.',
    oneOf: [{ type: 'string' }, { type: 'null' }],
  })
  readonly nextPageQuery: PQ | null;

  /**
   * The items in the current page.
   */
  @ApiProperty({ description: 'The items in the current page.' })
  readonly items: T[];

  /**
   * Creates a new page of results.
   *
   * @param items The items in the current page.
   * @param query The query for the current page. If `null`, the `nextPageQuery` will also be `null`.
   * @param readAfterResolver A function that takes an item in the results and returns the corresponding `readAfter`
   *   value. Defaults to taking the `id` property of the item.
   */
  constructor(
    items: T[] = [],
    query: WithLimit<PQ> | null,
    readAfterResolver: (item: T) => PQ['readAfter'] = (item: any) => item.id,
  ) {
    this.items = items;

    const isPageFull = query && query.limit > 0 && items.length >= query.limit;

    this.nextPageQuery = isPageFull
      ? query.copy({ readAfter: readAfterResolver(items.at(-1) as T) } as any)
      : null;
  }

  /**
   * Creates a copy of the current page, with the items transformed using the provided function.
   * This can be used to convert items to DTOs, for example.
   * Pagination must be preserved, so the `nextPageQuery` is copied as-is.
   *
   * @param fn The function to apply to each item in the page.
   * @returns The new page with the transformed items.
   */
  map<U>(fn: (item: T) => U): Page<U, PQ> {
    return plainToInstance<Page<U, PQ>, any>(Page, {
      items: this.items.map(fn),
      nextPageQuery: this.nextPageQuery,
    });
  }

  /**
   * Returns a {@link Page} subclass that can be used for OpenAPI generation (e.g. in `ApiResponse` decorators).
   *
   * @param type The type of items in the page.
   * @returns The page type.
   */
  static of<T>(type: Type<T>): Type<Page<T>> {
    class TypedPage extends Page<T> {}
    ApiProperty({ type: () => [type] })(TypedPage.prototype, 'items');
    Object.defineProperty(TypedPage, 'name', { value: `PageOf${type.name}` });
    return TypedPage;
  }
}
