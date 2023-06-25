import { Transform, instanceToPlain } from 'class-transformer';
import { PageQuery, WithLimit } from './query.js';

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
  readonly nextPageQuery: PQ | null;

  /**
   * The items in the current page.
   */
  readonly items: T[];

  /**
   * Creates a new page of results.
   *
   * @param items The items in the current page.
   * @param query The query for the current page.
   * @param readAfterResolver A function that takes an item in the results and returns the corresponding `readAfter`
   *   value. Defaults to taking the `id` property of the item.
   */
  constructor(
    items: T[] = [],
    query: WithLimit<PQ>,
    readAfterResolver: (item: T) => PQ['readAfter'] = (item: any) => item.id,
  ) {
    this.items = items;

    const isPageFull = query.limit > 0 && items.length >= query.limit;

    this.nextPageQuery = isPageFull
      ? query.copy({ readAfter: readAfterResolver(items.at(-1) as T) } as any)
      : null;
  }
}
