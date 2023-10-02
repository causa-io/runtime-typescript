import { Type } from '@nestjs/common';
import { EventTransaction } from './event-transaction.js';
import { Transaction } from './transaction.js';

/**
 * A transaction that exposes methods to find and replace entities based on their primary key.
 */
export interface FindReplaceStateTransaction {
  /**
   * Replaces a possibly existing entity with the given one.
   * If the entity does not exist, it is created.
   * If the entity exists, it is fully replaced, not just updated. This means that unspecified properties are set to
   * `null` rather than being left untouched.
   *
   * @param entity The entity to set in the state.
   */
  replace<T extends object>(entity: T): Promise<void>;

  /**
   * Deletes an entity of the given type with the same primary key as the given entity.
   *
   * @param type The type of the entity to delete.
   * @param key The primary key of the entity to delete, as a partial entity containing all the primary key columns.
   */
  deleteWithSameKeyAs<T extends object>(
    type: Type<T>,
    key: Partial<T>,
  ): Promise<void>;

  /**
   * Looks up an entity of the given type with the same primary key as the given entity.
   * This should return the entity even if it is deleted.
   *
   * @param type The type of the entity to find.
   * @param entity The entity to use as a template for the search. All the primary key should be set, and other
   *   properties will be ignored.
   * @returns The entity if it exists, or `undefined` if it does not.
   */
  findOneWithSameKeyAs<T extends object>(
    type: Type<T>,
    entity: Partial<T>,
  ): Promise<T | undefined>;
}

/**
 * A transaction that at least conforms to {@link FindReplaceStateTransaction}.
 */
export type FindReplaceTransaction = Transaction<
  FindReplaceStateTransaction,
  EventTransaction
>;
