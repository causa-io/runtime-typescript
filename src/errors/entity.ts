/**
 * References the type of the entity for which an error occurred.
 * Can be `null` if it is not available.
 */
type EntityTypeForError = { new (...args: any[]): any } | null;

/**
 * An error thrown when operating on an entity.
 */
export abstract class EntityError extends Error {
  /**
   * Creates a new {@link EntityError}.
   *
   * @param entityType The type of entity, or `null` if it is not available.
   * @param key A value representing the key used to look up the entity, or `null` if it is not available.
   * @param message The error message.
   */
  constructor(
    readonly entityType: EntityTypeForError,
    readonly key: any,
    message: string,
  ) {
    super(message);
  }
}

/**
 * An error thrown when an entity is not found in the state / database.
 */
export class EntityNotFoundError extends EntityError {
  /**
   * Creates a new {@link EntityNotFoundError}.
   *
   * @param entityType The type of entity, or `null` if it is not available.
   * @param key A value representing the key used to look up the entity, or `null` if it is not available.
   */
  constructor(entityType: EntityTypeForError, key: any) {
    super(entityType, key, 'The entity could not be found.');
  }
}

/**
 * An error thrown when trying to create an entity that already exists.
 */
export class EntityAlreadyExistsError extends EntityError {
  /**
   * Creates a new {@link EntityAlreadyExistsError}.
   *
   * @param entityType The type of entity, or `null` if it is not available.
   * @param key A value representing the key used to look up the entity, or `null` if it is not available.
   */
  constructor(entityType: EntityTypeForError, key: any) {
    super(entityType, key, 'The entity already exists.');
  }
}

/**
 * An error thrown when trying to update an entity, but the version of the entity in the state does not match the
 * provided version.
 */
export class IncorrectEntityVersionError extends EntityError {
  /**
   * Creates a new {@link IncorrectEntityVersionError}.
   *
   * @param entityType The type of entity, or `null` if it is not available.
   * @param key A value representing the key used to look up the entity, or `null` if it is not available.
   * @param providedVersion The version of the entity provided by the requester of the update.
   * @param stateVersion The version of the entity, as found in the state.
   */
  constructor(
    entityType: EntityTypeForError,
    key: any,
    readonly providedVersion: Date,
    readonly stateVersion: Date,
  ) {
    super(entityType, key, `The provided entity version is incorrect.`);
  }
}

/**
 * An error thrown when trying to perform an operation on an entity that is not supported.
 */
export class UnsupportedEntityOperationError extends EntityError {}
