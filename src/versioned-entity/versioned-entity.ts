/**
 * An entity that supports versioning through lifecycle dates.
 */
export type VersionedEntity = {
  /**
   * The date at which the entity was created.
   */
  createdAt: Date;

  /**
   * The date at which the entity was last updated.
   */
  updatedAt: Date;

  /**
   * The date at which the entity was deleted. This is `null` as long as the entity is not deleted, and is equal to
   * `updatedAt` when the entity is deleted.
   */
  deletedAt: Date | null;
};

/**
 * An object containing all the entity's properties required for a creation, apart from those that will be automatically
 * filled.
 */
export type VersionedEntityCreation<T extends VersionedEntity> = Omit<
  T,
  'createdAt' | 'updatedAt' | 'deletedAt'
>;

/**
 * An object containing the properties to update in the entity.
 * It should contain the primary key of the entity.
 * Lifecycle fields that are automatically filled cannot be specified.
 */
export type VersionedEntityUpdate<T extends VersionedEntity> = Partial<
  Omit<T, 'createdAt' | 'updatedAt'>
>;
