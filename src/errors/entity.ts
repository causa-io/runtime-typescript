/**
 * An error thrown when operating on an entity.
 */
export abstract class EntityError<T = any> extends Error {
  /**
   * Creates a new {@link EntityError}.
   *
   * @param entityType The type of entity.
   * @param key A partial object that should contain the primary key of the entity for which the error occurred.
   * @param message The error message.
   */
  constructor(
    readonly entityType: { new (...args: any[]): T },
    readonly key: Partial<T>,
    message: string,
  ) {
    super(message);
  }
}

/**
 * An error thrown when an entity is not found in the state / database.
 */
export class EntityNotFoundError<T = any> extends EntityError<T> {
  /**
   * Creates a new {@link EntityNotFoundError}.
   *
   * @param entityType The type of entity that could not be found.
   * @param key A partial entity that should contain the primary key of the entity that could not be found.
   */
  constructor(entityType: { new (...args: any[]): T }, key: Partial<T>) {
    super(entityType, key, 'The entity could not be found.');
  }
}

/**
 * An error thrown when trying to create an entity that already exists.
 */
export class EntityAlreadyExistsError<T = any> extends EntityError<T> {
  /**
   * Creates a new {@link EntityAlreadyExistsError}.
   *
   * @param entityType The type of entity that already exists.
   * @param key A partial entity that should contain the primary key of the entity that already exists.
   */
  constructor(entityType: { new (...args: any[]): T }, key: Partial<T>) {
    super(entityType, key, 'The entity already exists.');
  }
}

/**
 * An error thrown when trying to update an entity, but the version of the entity in the state does not match the
 * provided version.
 */
export class IncorrectEntityVersionError<T = any> extends EntityError<T> {
  /**
   * Creates a new {@link IncorrectEntityVersionError}.
   *
   * @param entityType The type of entity.
   * @param key A partial entity that should contain the primary key of the entity.
   * @param providedVersion The version of the entity provided by the requester of the update.
   * @param stateVersion The version of the entity, as found in the state.
   */
  constructor(
    entityType: { new (...args: any[]): T },
    key: Partial<T>,
    readonly providedVersion: Date,
    readonly stateVersion: Date,
  ) {
    super(entityType, key, `The provided entity version is incorrect.`);
  }
}
