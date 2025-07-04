import type { Type } from '@nestjs/common';
import {
  Transaction,
  TransactionRunner,
  type ReadOnlyStateTransaction,
  type TransactionOption,
} from '../transaction/index.js';
import type { KeyOfType } from '../typing/index.js';

/**
 * Options for the {@link VersionedEventProcessor.project} method.
 */
export type VersionedProjectionOptions<P extends object> = {
  /**
   * The existing state before processing the event.
   * This is only passed if {@link VersionedEventProcessor.stateKeyForEvent} is implemented and returns a key, and when
   * the state already exists.
   */
  state?: P;
};

/**
 * Options for processing a versioned event.
 */
export type VersionedEventProcessingOptions<
  RWT extends Transaction,
  P extends object,
> = TransactionOption<RWT> & {
  /**
   * The existing state of the projection in the database.
   * If provided, this is used instead of fetching the state from the database.
   * Passing `null` means that the state does not currently exist in the database.
   */
  existingState?: P | null;
};

/**
 * A class that processes (timestamp) versioned events and builds a corresponding state.
 *
 * {@link VersionedEventProcessor.project} should be implemented to build the state from the event.
 * {@link VersionedEventProcessor.updateState} can be overridden to customize how the state is updated
 *   (e.g. update secondary indexes as well).
 */
export abstract class VersionedEventProcessor<
  RWT extends Transaction,
  ROT extends ReadOnlyStateTransaction,
  E extends object,
  P extends object,
  R extends TransactionRunner<RWT, ROT> = TransactionRunner<RWT, ROT>,
> {
  /**
   * Creates a new {@link VersionedEventProcessor}.
   *
   * @param projectionType The class of the state to build, which should be a type accepted by the state transaction.
   *   This is usually equal to the data in the event, but it can be different.
   * @param runner The {@link TransactionRunner} used to create transactions.
   * @param projectionVersionProperty The name of the property that should be used to compare the state and the
   *   projection's versions.
   */
  constructor(
    readonly projectionType: Type<P>,
    readonly runner: R,
    readonly projectionVersionProperty: KeyOfType<P, Date>,
  ) {}

  /**
   * A method that returns the key used to fetch the existing state for the given event.
   * This only needs to be implemented if the existing state should be passed to
   * {@link VersionedEventProcessor.project}.
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
   * This is usually the identity function on the event's data, but it can be different.
   *
   * @param event The event from which to build the projection.
   * @param transaction The transaction to use if additional data must be fetched.
   * @param options Options when building the projection.
   */
  protected abstract project(
    event: E,
    transaction: RWT,
    options?: VersionedProjectionOptions<P>,
  ): Promise<P>;

  /**
   * Checks whether the given projection is strictly more recent than the state, based on their
   * {@link VersionedEventProcessor.projectionVersionProperty} values.
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
      state[this.projectionVersionProperty] <
      projection[this.projectionVersionProperty]
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
  protected async updateState(projection: P, transaction: RWT): Promise<void> {
    await transaction.set(projection);
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
    options: VersionedEventProcessingOptions<RWT, P> = {},
  ): Promise<P | null> {
    return await this.runner.run(
      { transaction: options.transaction },
      async (transaction) => {
        const isExistingStateProvided = options.existingState !== undefined;

        const stateKey = this.stateKeyForEvent(event);
        let state: P | undefined;
        if (stateKey) {
          state = isExistingStateProvided
            ? (options.existingState ?? undefined)
            : await transaction.get(this.projectionType, stateKey);
        }

        const projection = await this.project(event, transaction, { state });

        if (!stateKey) {
          state = isExistingStateProvided
            ? (options.existingState ?? undefined)
            : await transaction.get(this.projectionType, projection);
        }

        const isProjectionMoreRecent = this.isProjectionMoreRecentThanState(
          projection,
          state,
        );

        if (!isProjectionMoreRecent) {
          return null;
        }

        await this.updateState(projection, transaction);

        return projection;
      },
    );
  }
}
