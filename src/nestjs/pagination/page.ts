import { PageQuery, WithLimit } from './query.js';

/**
 * A generic page of items, along with the query to fetch the next page of results.
 */
export class Page<T, PQ extends PageQuery<any> = PageQuery> {
  /**
   * The query to make to fetch the next page of results.
   */
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
