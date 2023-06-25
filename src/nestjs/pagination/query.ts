import { Type, instanceToInstance } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';
import { AllowMissing } from '../../validation/index.js';
import { IsKeyTypeStringOrSkip } from './is-key-type-string-or-skip.decorator.js';

/**
 * The base type defining a query to fetch a page of items.
 * Most of the time, this should be subclassed to add additional filters.
 * The {@link PageQuery.readAfter} can also be set to a custom type, in which case it should be decorated with
 * `CustomReadAfterType`.
 */
export class PageQuery<T = string> {
  /**
   * The maximum number of returned results.
   */
  @IsPositive()
  @IsInt()
  @AllowMissing()
  @Type()
  limit?: number;

  /**
   * The token to pass when fetching the next page of results. Provided by the previous query response.
   */
  @IsKeyTypeStringOrSkip()
  @AllowMissing()
  readAfter?: T;

  /**
   * Creates a copy of the current query, with the {@link PageQuery.limit} bounded to the provided value. If `limit` was
   * not set, the returned copy contains the provided value.
   *
   * @param maxLimit The maximum allowed `limit`.
   * @returns A copy of the current query with the limit set, and ensured to be at most `maxLimit`.
   */
  withMaxLimit(maxLimit: number): WithLimit<this> {
    const limit = Math.min(maxLimit, this.limit ?? maxLimit);
    return this.copy({ limit } as any) as WithLimit<this>;
  }

  /**
   * Creates a copy of the current query, with the provided parameters overriding the current ones.
   *
   * @param overrides The query parameters to change.
   * @returns A copy of the current query with the provided parameters.
   */
  copy(overrides: Partial<this> = {}): this {
    const copy = instanceToInstance(this);
    return Object.assign(copy, overrides);
  }
}

/**
 * A page query with a limit set.
 */
export type WithLimit<PQ extends PageQuery<any>> = PQ & { limit: number };
