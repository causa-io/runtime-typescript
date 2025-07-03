import type { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import * as uuid from 'uuid';
import {
  EntityAlreadyExistsError,
  EntityNotFoundError,
  IncorrectEntityVersionError,
  UnsupportedEntityOperationError,
} from '../errors/index.js';
import type {
  Event,
  EventData,
  EventName,
  PublishOptions,
} from '../events/index.js';
import {
  Transaction,
  TransactionRunner,
  type ReadOnlyStateTransaction,
  type TransactionOption,
} from '../transaction/index.js';
import type { KeyOfType } from '../typing/index.js';
import {
  VersionedEventProcessor,
  type VersionedProjectionOptions,
} from './event-processor.js';
import type {
  VersionedEntity,
  VersionedEntityCreation,
  VersionedEntityUpdate,
} from './versioned-entity.js';

/**
 * A versioned entity where the only mandatory timestamp is `updatedAt`.
 */
export type VersionedEntityWithOptionalTimestamps = Pick<
  VersionedEntity,
  'updatedAt'
> &
  Partial<Omit<VersionedEntity, 'updatedAt'>>;

/**
 * Options when performing a generic write operation on a versioned entity.
 */
export type VersionedEntityOperationOptions<T extends Transaction> =
  TransactionOption<T> & {
    /**
     * Options when publishing the event.
     */
    publishOptions?: PublishOptions;
  };

/**
 * Options when performing an update operation on a versioned entity.
 */
export type VersionedEntityUpdateOptions<
  T extends Transaction,
  P extends VersionedEntityWithOptionalTimestamps,
> = VersionedEntityOperationOptions<T> & {
  /**
   * A validation function that will be called with the current state of the entity in the database.
   * This function should throw if the update should not be allowed.
   *
   * @param existingEntity The current state of the entity.
   * @param transaction The current transaction.
   */
  validationFn?: (existingEntity: P, transaction: T) => Promise<void>;

  /**
   * An existing entity to use instead of looking it up from the state.
   */
  existingEntity?: P;

  /**
   * The known `updatedAt` date of the entity. It will be compared against the current state.
   */
  checkUpdatedAt?: Date;
};

/**
 * Options when creating a {@link VersionedEntityManager}.
 */
export type VersionedEntityManagerOptions = Pick<
  VersionedEntityManager<any, any, any>,
  'hasCreationTimestampProperty' | 'hasDeletionTimestampProperty'
>;

/**
 * A manager that can be used to operate on versioned entities.
 * It provides CRUD-like methods that publish events and update the state accordingly.
 */
export class VersionedEntityManager<
  RWT extends Transaction,
  ROT extends ReadOnlyStateTransaction,
  E extends Event<string, VersionedEntityWithOptionalTimestamps>,
  R extends TransactionRunner<RWT, ROT> = TransactionRunner<RWT, ROT>,
> extends VersionedEventProcessor<RWT, ROT, E, EventData<E>, R> {
  /**
   * Whether the `createdAt` property should be populated when creating an entity.
   */
  readonly hasCreationTimestampProperty: boolean;

  /**
   * Whether the `deletedAt` property exists on the entity.
   * This determines whether the entity can be soft-deleted.
   * If this is `false`, {@link VersionedEntityManager.delete} will throw an error.
   */
  readonly hasDeletionTimestampProperty: boolean;

  /**
   * Creates a new {@link VersionedEntityManager}.
   *
   * @param topic The topic to which the event should be published.
   * @param eventType The type of event to publish.
   * @param entityType The type of entity to manage, which should also be the type of data in the event.
   * @param runner The {@link TransactionRunner} used to create transactions.
   */
  constructor(
    topic: string,
    eventType: Type<E>,
    entityType: Type<EventData<E> & VersionedEntity>,
    runner: R,
  );

  /**
   * Creates a new {@link VersionedEntityManager}.
   *
   * @param topic The topic to which the event should be published.
   * @param eventType The type of event to publish.
   * @param entityType The type of entity to manage, which should also be the type of data in the event.
   * @param runner The {@link TransactionRunner} used to create transactions.
   * @param options Options for the entity to manage.
   */
  constructor(
    topic: string,
    eventType: Type<E>,
    entityType: Type<EventData<E>>,
    runner: R,
    options: VersionedEntityManagerOptions,
  );

  constructor(
    readonly topic: string,
    readonly eventType: Type<E>,
    entityType: Type<EventData<E>>,
    runner: R,
    options: VersionedEntityManagerOptions = {
      hasCreationTimestampProperty: true,
      hasDeletionTimestampProperty: true,
    },
  ) {
    super(entityType, runner, 'updatedAt' as KeyOfType<EventData<E>, Date>);

    this.hasCreationTimestampProperty = options.hasCreationTimestampProperty;
    this.hasDeletionTimestampProperty = options.hasDeletionTimestampProperty;
  }

  protected async project(
    event: E,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transaction: RWT,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: VersionedProjectionOptions<EventData<E>>,
  ): Promise<EventData<E>> {
    return event.data;
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
    options: TransactionOption<RWT> = {},
  ): Promise<void> {
    await this.runner.run(
      { transaction: options.transaction },
      async (transaction) => {
        const existingEntity = await transaction.get(
          this.projectionType,
          entity,
        );

        if (!existingEntity) {
          return;
        }

        transaction.validatePastDateOrFail(existingEntity.updatedAt);

        // This could `null` for a soft-deleted entity, or `undefined` if `deletedAt` is not a property of the entity.
        if (existingEntity.deletedAt == null) {
          throw new EntityAlreadyExistsError(this.projectionType, entity);
        }
      },
    );
  }

  /**
   * Looks up an entity using its primary key columns and returns it.
   * This method will throw if the entity does not exist (including soft deletes).
   * It also (optionally) enforces the given {@link VersionedEntityUpdateOptions.validationFn} and
   * {@link VersionedEntityUpdateOptions.checkUpdatedAt} if provided.
   *
   * @param entity The entity to find. It should at least contain the primary key columns.
   * @param options Options when finding the entity.
   * @returns The found entity.
   */
  protected async findExistingEntityOrFail(
    entity: Partial<EventData<E>>,
    options: VersionedEntityUpdateOptions<RWT, EventData<E>> = {},
  ): Promise<EventData<E>> {
    return await this.runner.run(
      { transaction: options.transaction },
      async (transaction) => {
        const existingEntity =
          options.existingEntity ??
          (await transaction.get(this.projectionType, entity));

        if (!existingEntity || existingEntity.deletedAt != null) {
          throw new EntityNotFoundError(this.projectionType, entity);
        }

        if (options.validationFn) {
          await options.validationFn(existingEntity, transaction);
        }

        if (
          options.checkUpdatedAt &&
          existingEntity.updatedAt.getTime() !==
            options.checkUpdatedAt.getTime()
        ) {
          throw new IncorrectEntityVersionError(
            this.projectionType,
            entity,
            options.checkUpdatedAt,
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
    options: VersionedEntityOperationOptions<RWT> = {},
  ): Promise<E> {
    return await this.runner.run(
      { transaction: options.transaction },
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
    options: VersionedEntityOperationOptions<RWT> = {},
  ): Promise<E> {
    return await this.runner.run(
      { transaction: options.transaction },
      async (transaction) => {
        await this.checkDoesNotExistOrFail(creation as Partial<EventData<E>>, {
          transaction,
        });

        const entity = plainToInstance(this.projectionType, {
          ...creation,
          updatedAt: transaction.timestamp,
          ...(this.hasCreationTimestampProperty
            ? { createdAt: transaction.timestamp }
            : {}),
          ...(this.hasDeletionTimestampProperty ? { deletedAt: null } : {}),
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
   * Defines how an entity should be updated.
   * The default implementation performs a shallow merge of the existing entity and the update data. Override this
   * method to customize the update behavior.
   * This method does not have to return a class instance, as it will be passed to `plainToInstance` to create the
   * updated entity.
   *
   * @param existingEntity The existing entity to update.
   * @param update The update data.
   * @returns The updated entity.
   */
  protected makeUpdatedObject(
    existingEntity: EventData<E>,
    update: VersionedEntityUpdate<EventData<E>>,
  ): EventData<E> {
    return {
      ...existingEntity,
      ...update,
    };
  }

  /**
   * Updates an entity and creates a new event from the given update data, publishes the event, and processes it using
   * {@link VersionedEntityManager.processEvent}.
   *
   * By default, the update only performs a shallow merge. Override {@link VersionedEntityManager.makeUpdatedObject} to
   * customize the update behavior.
   *
   * @param eventName The name of the event when updating the entity.
   * @param entityKey An object containing the primary key columns of the entity to update.
   * @param update The data to use when updating the entity, or a function returning the data.
   * @param options Options when updating the entity.
   * @returns The processed and published event corresponding to the update.
   */
  async update(
    eventName: EventName<E>,
    entityKey: Partial<EventData<E>>,
    update:
      | VersionedEntityUpdate<EventData<E>>
      | ((
          existingEntity: EventData<E>,
          transaction: RWT,
        ) => Promise<VersionedEntityUpdate<EventData<E>>>),
    options: VersionedEntityUpdateOptions<RWT, EventData<E>> = {},
  ): Promise<E> {
    return await this.runner.run(
      { transaction: options.transaction },
      async (transaction) => {
        const existingEntity = await this.findExistingEntityOrFail(entityKey, {
          transaction,
          existingEntity: options.existingEntity,
          checkUpdatedAt: options.checkUpdatedAt,
          validationFn: options.validationFn,
        });

        if (typeof update === 'function') {
          update = await update(existingEntity, transaction);
        }

        const entity = plainToInstance(
          this.projectionType,
          this.makeUpdatedObject(existingEntity, {
            ...update,
            updatedAt: transaction.timestamp,
          }),
        );

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
   * This method will throw an error if the entity does not have a `deletedAt` property (i.e.
   * {@link VersionedEntityManager.hasDeletionTimestampProperty} is `false`).
   *
   * @param eventName The name of the event when deleting the entity.
   * @param entityKey An object containing the primary key columns of the entity to delete.
   * @param options Options when deleting the entity.
   * @returns The processed and published event corresponding to the deletion.
   */
  async delete(
    eventName: EventName<E>,
    entityKey: Partial<EventData<E>>,
    options: VersionedEntityUpdateOptions<RWT, EventData<E>> = {},
  ): Promise<E> {
    if (!this.hasDeletionTimestampProperty) {
      throw new UnsupportedEntityOperationError(
        this.projectionType,
        entityKey,
        'The entity does not support deletion.',
      );
    }

    return await this.runner.run(
      { transaction: options.transaction },
      async (transaction) => {
        const existingEntity = await this.findExistingEntityOrFail(entityKey, {
          transaction,
          existingEntity: options.existingEntity,
          checkUpdatedAt: options.checkUpdatedAt,
          validationFn: options.validationFn,
        });

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
