/**
 * An entity that can be used as a lock.
 */
export interface LockEntity {
  /**
   * The ID that uniquely references the lock.
   */
  readonly id: string;

  /**
   * The random string known only from the holder of the lock.
   */
  readonly lock: string | null;

  /**
   * The date after which it is acceptable to capture the lock if it has not been released.
   */
  readonly expiresAt: Date | null;
}
