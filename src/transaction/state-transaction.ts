import type { Type } from '@nestjs/common';

/**
 * A transaction that exposes methods to get and set entities based on their primary key.
 */
export interface StateTransaction {
  /**
   * Replaces a possibly existing entity with the given one.
   * If the entity does not exist, it is created.
   * If the entity exists, it is fully replaced, not just updated.
   *
   * @param entity The entity to set in the state.
   */
  set<T extends object>(entity: T): Promise<void>;

  /**
   * Deletes an entity of the given type with the same primary key as the given entity.
   *
   * @param type The type of the entity to delete.
   * @param key The primary key of the entity to delete, as a partial entity containing all the primary key columns.
   */
  delete<T extends object>(type: Type<T>, key: Partial<T>): Promise<void>;
  delete<T extends object>(entity: T): Promise<void>;

  /**
   * Looks up an entity of the given type with the same primary key as the given entity.
   *
   * @param type The type of the entity to find.
   * @param entity The entity to use as a template for the search. All the primary key should be set, and other
   *   properties will be ignored.
   * @returns The entity if it exists, or `undefined` if it does not.
   */
  get<T extends object>(
    type: Type<T>,
    entity: Partial<T>,
  ): Promise<T | undefined>;
}
