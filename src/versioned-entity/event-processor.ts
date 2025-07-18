import type { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  EntityNotFoundError,
  OldEntityVersionError,
  toNull,
  TryMap,
  UnsupportedEntityOperationError,
} from '../errors/index.js';
import {
  Transaction,
  TransactionRunner,
  type ReadOnlyStateTransaction,
  type ReadOnlyTransactionOption,
  type TransactionOption,
} from '../transaction/index.js';
import type { KeyOfType } from '../typing/index.js';

/**
 * Options for the {@link VersionedEventProcessor.project} method.
 */
export type VersionedProjectionOptions<P extends object> = {
  /**
   * The existing state before processing the event, forwarded from {@link VersionedEventProcessor.processEvent}.
   * See {@link VersionedEventProcessingOptions.existingState}.
   */
  existingState?: P | null;
};

/**
 * A function that fetches the version of a projection.
 */
export type ProjectionVersionFetcher<P extends object> = (
  projection: P,
) => Date | undefined | null;

/**
 * A context returned by {@link VersionedEventProcessor.project} that can contain additional information to take into
 * account for processing.
 */
export type ProjectionContext<P extends object, K extends keyof P = keyof P> = {
  /**
   * The existing state of the projection in the database.
   * This should be passed if the state was fetched from the database as part of the projection.
   * Passing `null` means that the state does not currently exist in the database.
   */
  existingState?: P | null;

  /**
   * A initial state used when the projection function returns a partial object.
   * If provided, either the null projection or the existing state will be used to fill in the missing properties.
   */
  defaultProjection?: Omit<P, K>;

  /**
   * A function that returns the version property of the projection, used to compare the projection's version with the
   * existing state.
   */
  projectionVersionProperty?: ProjectionVersionFetcher<P>;
};

/**
 * The return type of a {@link VersionedEventProcessor.project} method that provides a {@link ProjectionContext}.
 */
export type ProjectionWithContext<
  P extends object,
  K extends keyof P = keyof P,
> = [Pick<P, K> & Partial<P>, ProjectionContext<P, K>];

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

  /**
   * If `true`, the processor will reprocess the event even if the existing state has the same version as the event.
   * This can be useful for backfilling cases.
   */
  reprocessEqualVersion?: boolean;
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
   * The function to use to fetch the version of a projection.
   */
  readonly projectionVersionProperty: ProjectionVersionFetcher<P>;

  /**
   * Creates a new {@link VersionedEventProcessor}.
   *
   * @param projectionType The class of the state to build, which should be a type accepted by the state transaction.
   *   This is usually equal to the data in the event, but it can be different.
   * @param runner The {@link TransactionRunner} used to create transactions.
   * @param projectionVersionProperty The property or function to use to fetch the version of the projection or state.
   */
  constructor(
    readonly projectionType: Type<P>,
    readonly runner: R,
    projectionVersionProperty: KeyOfType<P, Date> | ProjectionVersionFetcher<P>,
  ) {
    this.projectionVersionProperty =
      typeof projectionVersionProperty === 'function'
        ? projectionVersionProperty
        : (p) => p[projectionVersionProperty] as Date | undefined | null;
  }

  /**
   * A function that builds a projection from an event.
   * This is usually the identity function on the event's data, but it can be different.
   *
   * @param event The event from which to build the projection.
   * @param transaction The transaction to use if additional data must be fetched.
   * @param options Options when building the projection.
   * @returns The projection, and possibly a context with additional information for processing.
   */
  protected abstract project(
    event: E,
    transaction: RWT,
    options?: VersionedProjectionOptions<P>,
  ): Promise<P | ProjectionWithContext<P, any>>;

  /**
   * Validates that the given projection is strictly more recent than the state, based on their
   * {@link VersionedEventProcessor.projectionVersionProperty} values.
   *
   * @param projection The projection to compare.
   * @param state The state to compare, or `null` if it does not exist.
   * @param options Options for the validation.
   */
  protected validateProjectionIsMoreRecentThanState(
    projection: P,
    state: P | null,
    options: Pick<
      VersionedEventProcessingOptions<RWT, P>,
      'reprocessEqualVersion'
    > &
      Pick<ProjectionContext<P>, 'projectionVersionProperty'> = {},
  ): void {
    if (!state) {
      return;
    }

    const projectionVersionProperty =
      options.projectionVersionProperty ?? this.projectionVersionProperty;

    const projectionVersion = projectionVersionProperty(projection);
    if (!projectionVersion) {
      throw new UnsupportedEntityOperationError(
        this.projectionType,
        projection,
        'Could not find version in projection.',
      );
    }

    const stateVersion = projectionVersionProperty(state);
    if (!stateVersion) {
      return;
    }

    const isOld = options.reprocessEqualVersion
      ? stateVersion > projectionVersion
      : stateVersion >= projectionVersion;
    if (isOld) {
      throw new OldEntityVersionError(
        this.projectionType,
        state,
        projectionVersion,
        stateVersion,
      );
    }
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
   * Throws the error corresponding to the entity not being found.
   * By default, this throws an {@link EntityNotFoundError}, but it can be overridden to throw a different error.
   *
   * @param key The key of the entity that was not found.
   */
  protected throwNotFoundError(key: Partial<P>): never {
    throw new EntityNotFoundError(this.projectionType, key);
  }

  /**
   * Retrieves the projection for the given key.
   * If the projection does not exist, an {@link EntityNotFoundError} is thrown.
   *
   * @param key The partial projection, containing the properties defining the key for the projection / state.
   * @param options Options for the operation.
   * @returns The projection, if it exists.
   */
  async get(
    key: Partial<P>,
    options: ReadOnlyTransactionOption<ROT> = {},
  ): Promise<P> {
    return await this.runner.run(
      { readOnly: true, transaction: options.transaction },
      async (transaction) => {
        const state = await transaction.get(this.projectionType, key);
        if (!state) {
          this.throwNotFoundError(key);
        }

        return state;
      },
    );
  }

  /**
   * Processes the given event, building the corresponding state.
   * This throws an {@link OldEntityVersionError} if the event's version is older than the existing state.
   *
   * @param event The event to process.
   * @param options Options for processing the event.
   * @returns The projection if the event was processed.
   */
  async processEvent(
    event: E,
    options: VersionedEventProcessingOptions<RWT, P> = {},
  ): Promise<P> {
    return await this.runner.run(
      { transaction: options.transaction },
      async (transaction) => {
        const projectionWithContext = await this.project(event, transaction, {
          existingState: options.existingState,
        });
        const [projectionOrPartial, context] = Array.isArray(
          projectionWithContext,
        )
          ? projectionWithContext
          : [projectionWithContext, {}];

        const state =
          options.existingState !== undefined
            ? options.existingState
            : context.existingState !== undefined
              ? context.existingState
              : await transaction.get(this.projectionType, projectionOrPartial);

        const projection = context.defaultProjection
          ? plainToInstance(this.projectionType, {
              ...(state ?? context.defaultProjection),
              ...projectionOrPartial,
            })
          : projectionOrPartial;

        this.validateProjectionIsMoreRecentThanState(projection, state, {
          reprocessEqualVersion: options.reprocessEqualVersion,
          projectionVersionProperty: context.projectionVersionProperty,
        });

        await this.updateState(projection, transaction);

        return projection;
      },
    );
  }

  /**
   * Processes the given event, building the corresponding state.
   * This is similar to {@link VersionedEventProcessor.processEvent}, but it returns `null` if the event was skipped
   * because a more recent state already exists.
   *
   * @param event The event to process.
   * @param options Options for processing the event.
   * @returns The projection if the event was processed, `null` if it was skipped because a more recent state already
   *   exists.
   */
  @TryMap(toNull(OldEntityVersionError))
  async processOrSkipEvent(
    event: E,
    options: VersionedEventProcessingOptions<RWT, P> = {},
  ): Promise<P | null> {
    return await this.processEvent(event, options);
  }
}
