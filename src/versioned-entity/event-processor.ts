import { Type } from '@nestjs/common';
import {
  FindReplaceTransaction,
  TransactionRunner,
} from '../transaction/index.js';
import { KeyOfType } from '../typing/index.js';
import { VersionedEntity } from './versioned-entity.js';

/**
 * Options for the {@link VersionedEntityEventProcessor.project} method.
 */
export type VersionedEntityProjectionOptions<P extends VersionedEntity> = {
  /**
   * The existing state before processing the event.
   * This is only passed if {@link VersionedEntityEventProcessor.stateKeyForEvent} is implemented and returns a key, and
   * when the state already exists.
   */
  state?: P;
};

/**
 * A class that processes events for a versioned entity and builds the corresponding state.
 *
 * {@link VersionedEntityEventProcessor.project} should be implemented to build the state from the event.
 * {@link VersionedEntityEventProcessor.updateState} can be overridden to customize how the state is updated
 *   (e.g. update secondary indexes as well).
 */
export abstract class VersionedEntityEventProcessor<
  T extends FindReplaceTransaction,
  E extends object,
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
   * @param runner The {@link TransactionRunner} used to create transactions.
   */
  constructor(
    readonly projectionType: Type<P>,
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
   * A method that returns the key used to fetch the existing state for the given event.
   * This only needs to be implemented if the existing state should be passed to
   * {@link VersionedEntityEventProcessor.project}.
   *
   * @param event The event for which the key should be built.
   * @returns The partial projection, containing the properties defining the key for the projection / state.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected stateKeyForEvent(event: E): Partial<P> | null {
    return null;
  }

  /**
   * A function that builds a projection from an event.
   * This is usually the identity function, but it can be different.
   *
   * @param event The event from which to build the projection.
   * @param transaction The transaction to use if additional data must be fetched.
   * @param options Options when building the projection.
   */
  protected abstract project(
    event: E,
    transaction: T,
    options?: VersionedEntityProjectionOptions<P>,
  ): Promise<P>;

  /**
   * Checks whether the given projection is strictly more recent than the state, based on their
   * {@link VersionedEntityEventProcessor.projectionVersionColumn} values.
   *
   * @param projection The projection to compare.
   * @param state The state to compare, or `undefined` if it does not exist.
   * @returns `true` if the projection is more recent than the state, `false` otherwise.
   */
  protected isProjectionMoreRecentThanState(
    projection: P,
    state: P | undefined,
  ): boolean {
    if (!state) {
      return true;
    }

    return (
      state[this.projectionVersionColumn] <
      projection[this.projectionVersionColumn]
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
   * @returns The projection if the event was processed, `null` if it was skipped because a more recent state already
   *   exists.
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
  ): Promise<P | null> {
    return await this.runner.runInNewOrExisting(
      options.transaction,
      async (transaction) => {
        const stateKey = this.stateKeyForEvent(event);
        let state = stateKey
          ? await transaction.stateTransaction.findOneWithSameKeyAs(
              this.projectionType,
              stateKey,
            )
          : undefined;

        const projection = await this.project(event, transaction, { state });

        if (!options.skipVersionCheck) {
          state ??= await transaction.stateTransaction.findOneWithSameKeyAs(
            this.projectionType,
            projection,
          );

          const isProjectionMoreRecent = this.isProjectionMoreRecentThanState(
            projection,
            state,
          );

          if (!isProjectionMoreRecent) {
            return null;
          }
        }

        await this.updateState(projection, transaction);

        return projection;
      },
    );
  }
}
