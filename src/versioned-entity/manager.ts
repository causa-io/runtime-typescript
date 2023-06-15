import { plainToInstance } from 'class-transformer';
import * as uuid from 'uuid';
import {
  EntityAlreadyExistsError,
  EntityNotFoundError,
  IncorrectEntityVersionError,
} from '../errors/index.js';
import {
  Event,
  EventData,
  EventName,
  PublishOptions,
} from '../events/index.js';
import { TransactionRunner } from '../transaction/index.js';
import { VersionedEntityEventProcessor } from './event-processor.js';
import { VersionedEntityTransaction } from './transaction.js';
import {
  VersionedEntity,
  VersionedEntityCreation,
  VersionedEntityUpdate,
} from './versioned-entity.js';

/**
 * Options when performing a generic write operation on a versioned entity.
 */
type VersionedEntityOperationOptions<T extends VersionedEntityTransaction> = {
  /**
   * The transaction to use.
   */
  transaction?: T;

  /**
   * Options when publishing the event.
   */
  publishOptions?: PublishOptions;
};

/**
 * Options when performing an update operation on a versioned entity.
 */
type VersionedEntityUpdateOptions<
  T extends VersionedEntityTransaction,
  P extends VersionedEntity,
> = VersionedEntityOperationOptions<T> & {
  /**
   * A validation function that will be called with the current state of the entity in the database.
   * This function should throw if the update should not be allowed.
   *
   * @param existingEntity The current state of the entity.
   */
  validationFn?: (existingEntity: P) => Promise<void>;

  /**
   * An existing entity to use instead of looking it up from the state.
   */
  existingEntity?: P;
};

/**
 * A manager that can be used to operate on versioned entities.
 * It provides CRUD-like methods that publish events and update the state accordingly.
 */
export class VersionedEntityManager<
  T extends VersionedEntityTransaction,
  E extends Event<string, VersionedEntity>,
> extends VersionedEntityEventProcessor<T, E, EventData<E>> {
  /**
   * Creates a new {@link VersionedEntityManager}.
   *
   * @param topic The topic to which the event should be published.
   * @param eventType The type of event to publish.
   * @param entityType The type of entity to manage, which should also be the type of data in the event.
   * @param runner The {@link TransactionRunner} used to create transactions.
   */
  constructor(
    readonly topic: string,
    readonly eventType: { new (): E },
    entityType: { new (): EventData<E> },
    runner: TransactionRunner<T>,
  ) {
    super(entityType, ({ data }) => data, runner);
  }

  /**
   * Generates a unique ID for an event.
   * Defaults to producing a UUID v4.
   * Can be overridden to produce a different type of ID.
   *
   * @returns A unique ID for an event.
   */
  protected generateEventId(): string {
    return uuid.v4();
  }

  /**
   * Returns the publish options to use when the {@link VersionedEntityManager} publishes an event.
   * This method can be overridden to provide entity-specific publish options.
   *
   * @param event The event that will be published.
   * @returns Options to use when publishing the event.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getPublishOptionsForEvent(event: E): PublishOptions {
    return {};
  }

  /**
   * Checks whether an entity with the same primary key columns as the given entity exists.
   * If a soft-deleted entity exists, it will be considered as not existing. However, its deleted date will be checked
   * against the transaction timestamp.
   *
   * @param entity The entity to check. It should at least contain the primary key columns.
   * @param options Options when checking for the existence of the entity.
   */
  protected async checkDoesNotExistOrFail(
    entity: Partial<EventData<E>>,
    options: {
      /**
       * The transaction to use.
       */
      transaction?: T;
    } = {},
  ): Promise<void> {
    await this.runner.runInNewOrExisting(
      options.transaction,
      async (transaction) => {
        const existingEntity =
          await transaction.stateTransaction.findOneWithSameKeyAs(
            this.projectionType,
            entity,
          );

        if (!existingEntity) {
          return;
        }

        transaction.validatePastDateOrFail(existingEntity.updatedAt);

        if (existingEntity.deletedAt === null) {
          throw new EntityAlreadyExistsError(this.projectionType, entity);
        }
      },
    );
  }

  /**
   * Looks up an entity using its primary key columns and returns it.
   * This method will throw if the entity does not exist (including soft deletes), or if it exists but has been updated
   * since the given `knownUpdatedAt` date.
   *
   * @param entity The entity to find. It should at least contain the primary key columns.
   * @param knownUpdatedAt The known `updatedAt` date of the entity. It will be compared against the current state.
   * @param options Options when finding the entity.
   * @returns The found entity.
   */
  protected async findExistingEntityOrFail(
    entity: Partial<EventData<E>>,
    knownUpdatedAt: Date,
    options: {
      /**
       * The transaction to use.
       */
      transaction?: T;

      /**
       * An existing entity to use instead of looking it up.
       */
      existingEntity?: EventData<E>;
    } = {},
  ): Promise<EventData<E>> {
    return await this.runner.runInNewOrExisting(
      options.transaction,
      async (transaction) => {
        const existingEntity =
          options.existingEntity ??
          (await transaction.stateTransaction.findOneWithSameKeyAs(
            this.projectionType,
            entity,
          ));

        if (!existingEntity || existingEntity.deletedAt !== null) {
          throw new EntityNotFoundError(this.projectionType, entity);
        }

        if (existingEntity.updatedAt.getTime() !== knownUpdatedAt.getTime()) {
          throw new IncorrectEntityVersionError(
            this.projectionType,
            entity,
            knownUpdatedAt,
            existingEntity.updatedAt,
          );
        }

        transaction.validatePastDateOrFail(existingEntity.updatedAt);

        return existingEntity;
      },
    );
  }

  /**
   * Creates a new event from the given entity, publishes it, and processes it using
   * {@link VersionedEntityManager.processEvent}.
   * The event is processed without checking the `updatedAt` date of the entity against the state because it is assumed
   * this method is called as part of an entity mutation, for which the state has already been checked.
   *
   * @param eventName The name of the event to publish.
   * @param entity The entity from which to build the event data.
   * @param options Options when processing and publishing the event.
   * @returns The processed and published event.
   */
  protected async makeProcessAndPublishEvent(
    eventName: EventName<E>,
    entity: EventData<E>,
    options: VersionedEntityOperationOptions<T> = {},
  ): Promise<E> {
    return await this.runner.runInNewOrExisting(
      options.transaction,
      async (transaction) => {
        const event = plainToInstance(this.eventType, {
          id: this.generateEventId(),
          name: eventName,
          producedAt: transaction.timestamp,
          data: entity,
        });

        const basePublishOptions = this.getPublishOptionsForEvent(event);
        await transaction.publish(this.topic, event, {
          ...basePublishOptions,
          ...options.publishOptions,
          attributes: {
            ...basePublishOptions.attributes,
            ...options.publishOptions?.attributes,
          },
        });

        await this.processEvent(event, {
          transaction,
          skipVersionCheck: true,
        });

        return event;
      },
    );
  }

  /**
   * Creates a new entity and event from the given creation data, publishes the event, and processes it using
   * {@link VersionedEntityManager.processEvent}.
   *
   * @param eventName The name of the event when creating the entity.
   * @param creation The data to use when creating the entity.
   * @param options Options when creating the entity.
   * @returns The processed and published event corresponding to the creation.
   */
  async create(
    eventName: EventName<E>,
    creation: VersionedEntityCreation<EventData<E>>,
    options: VersionedEntityOperationOptions<T> = {},
  ): Promise<E> {
    return await this.runner.runInNewOrExisting(
      options.transaction,
      async (transaction) => {
        await this.checkDoesNotExistOrFail(creation as Partial<EventData<E>>, {
          transaction,
        });

        const entity = plainToInstance(this.projectionType, {
          ...creation,
          createdAt: transaction.timestamp,
          updatedAt: transaction.timestamp,
          deletedAt: null,
        });

        const event = await this.makeProcessAndPublishEvent(eventName, entity, {
          transaction,
          publishOptions: options.publishOptions,
        });

        return event;
      },
    );
  }

  /**
   * Updates an entity and creates a new event from the given update data, publishes the event, and processes it using
   * {@link VersionedEntityManager.processEvent}.
   *
   * @param eventName The name of the event when updating the entity.
   * @param update The data to use when updating the entity.
   * @param knownUpdatedAt The known `updatedAt` date of the entity. It will be compared against the current state.
   * @param options Options when updating the entity.
   * @returns The processed and published event corresponding to the update.
   */
  async update(
    eventName: EventName<E>,
    update: VersionedEntityUpdate<EventData<E>>,
    knownUpdatedAt: Date,
    options: VersionedEntityUpdateOptions<T, EventData<E>> = {},
  ): Promise<E> {
    return await this.runner.runInNewOrExisting(
      options.transaction,
      async (transaction) => {
        const existingEntity = await this.findExistingEntityOrFail(
          update as Partial<EventData<E>>,
          knownUpdatedAt,
          { transaction, existingEntity: options.existingEntity },
        );

        if (options.validationFn) {
          await options.validationFn(existingEntity);
        }

        const entity = plainToInstance(this.projectionType, {
          ...existingEntity,
          ...update,
          updatedAt: transaction.timestamp,
        });

        const event = await this.makeProcessAndPublishEvent(eventName, entity, {
          transaction,
          publishOptions: options.publishOptions,
        });

        return event;
      },
    );
  }

  /**
   * Deletes an entity and creates a new event, publishes the event, and processes it using
   * {@link VersionedEntityManager.processEvent}.
   *
   * @param eventName The name of the event when deleting the entity.
   * @param entityKey An object containing the primary key columns of the entity to delete.
   * @param knownUpdatedAt The known `updatedAt` date of the entity. It will be compared against the current state.
   * @param options Options when deleting the entity.
   * @returns The processed and published event corresponding to the deletion.
   */
  async delete(
    eventName: EventName<E>,
    entityKey: Partial<EventData<E>>,
    knownUpdatedAt: Date,
    options: VersionedEntityUpdateOptions<T, EventData<E>> = {},
  ): Promise<E> {
    return await this.runner.runInNewOrExisting(
      options.transaction,
      async (transaction) => {
        const existingEntity = await this.findExistingEntityOrFail(
          entityKey,
          knownUpdatedAt,
          { transaction, existingEntity: options.existingEntity },
        );

        if (options.validationFn) {
          await options.validationFn(existingEntity);
        }

        const entity = plainToInstance(this.projectionType, {
          ...existingEntity,
          updatedAt: transaction.timestamp,
          deletedAt: transaction.timestamp,
        });

        const event = await this.makeProcessAndPublishEvent(eventName, entity, {
          transaction,
          publishOptions: options.publishOptions,
        });

        return event;
      },
    );
  }
}
