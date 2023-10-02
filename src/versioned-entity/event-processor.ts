import { Type } from '@nestjs/common';
import { Event } from '../events/index.js';
import {
  FindReplaceTransaction,
  TransactionRunner,
} from '../transaction/index.js';
import { KeyOfType } from '../typing/index.js';
import { VersionedEntity } from './versioned-entity.js';

/**
 * A function that builds a projection from an event.
 */
type VersionedEntityProjection<
  T extends FindReplaceTransaction,
  E extends Event,
  P extends VersionedEntity,
> = (event: E, transaction: T) => Promise<P>;

/**
 * A class that processes events for a versioned entity and builds the corresponding state.
 *
 * It can be subclassed to customize how the state is built, in which case
 * {@link VersionedEntityEventProcessor.updateState} should be overridden.
 */
export class VersionedEntityEventProcessor<
  T extends FindReplaceTransaction,
  E extends Event,
  P extends VersionedEntity,
  R extends TransactionRunner<T> = TransactionRunner<T>,
> {
  /**
   * The name of the column that should be used to compare the state and the projection's versions.
   */
  protected readonly projectionVersionColumn: KeyOfType<P, Date>;

  /**
   * Creates a new {@link VersionedEntityEventProcessor}.
   *
   * @param projectionType The class of the state to build, which should be a type accepted by the state transaction.
   *   This is usually equal to the entity (data) in the event, but it can be different.
   * @param project A function that builds the state (projection) from the event data.
   *   This is usually the identity function, but it can be different.
   * @param runner The {@link TransactionRunner} used to create transactions.
   */
  constructor(
    readonly projectionType: Type<P>,
    readonly project: VersionedEntityProjection<T, E, P>,
    readonly runner: R,
    options: {
      /**
       * The name of the column that should be used to compare the state and the projection's versions.
       * Defaults to `updatedAt`.
       */
      projectionVersionColumn?: KeyOfType<P, Date>;
    } = {},
  ) {
    this.projectionVersionColumn =
      options.projectionVersionColumn ?? ('updatedAt' as any);
  }

  /**
   * Checks whether the given projection is strictly more recent than the state, based on their
   * {@link VersionedEntityEventProcessor.projectionVersionColumn} values.
   *
   * @param projection The projection to compare.
   * @param options Options for the comparison.
   * @returns `true` if the projection is more recent than the state, `false` otherwise.
   */
  async isProjectionMoreRecentThanState(
    projection: P,
    options: {
      /**
       * The transaction to use to fetch the state.
       */
      transaction?: T;
    } = {},
  ): Promise<boolean> {
    return await this.runner.runInNewOrExisting(
      options.transaction,
      async (transaction) => {
        const state = await transaction.stateTransaction.findOneWithSameKeyAs(
          this.projectionType,
          projection,
        );

        if (!state) {
          return true;
        }

        return (
          state[this.projectionVersionColumn] <
          projection[this.projectionVersionColumn]
        );
      },
    );
  }

  /**
   * Updates the current state using the given projection. By default, it replaces the state with the new projection.
   * This method can be overridden to customize how the state is updated (e.g. perform an update rather than a
   * replacement).
   *
   * @param projection The new projection to update the state with.
   * @param transaction The transaction to use to update the state.
   */
  protected async updateState(projection: P, transaction: T): Promise<void> {
    await transaction.stateTransaction.replace(projection);
  }

  /**
   * Processes the given event, building the corresponding state.
   *
   * @param event The event to process.
   * @param options Options for processing the event.
   * @returns `true` if the event was processed, `false` if it was skipped because a more recent state already exists.
   */
  async processEvent(
    event: E,
    options: {
      /**
       * The transaction to use.
       */
      transaction?: T;

      /**
       * Whether to skip the check that the projection is more recent than the state.
       * If `true`, the state will be updated unconditionally.
       */
      skipVersionCheck?: boolean;
    } = {},
  ): Promise<boolean> {
    return await this.runner.runInNewOrExisting(
      options.transaction,
      async (transaction) => {
        const projection = await this.project(event, transaction);

        if (!options.skipVersionCheck) {
          const isProjectionMoreRecent =
            await this.isProjectionMoreRecentThanState(projection, {
              transaction,
            });

          if (!isProjectionMoreRecent) {
            return false;
          }
        }

        await this.updateState(projection, transaction);

        return true;
      },
    );
  }
}
