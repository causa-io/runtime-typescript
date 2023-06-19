/**
 * An error thrown when the lock for a resource fails to be acquired because the resource is already locked.
 */
export class LockAcquisitionError extends Error {
  constructor(
    readonly existingLockExpiresAt: Date,
    message = 'Failed to acquire the lock.',
  ) {
    super(message);
  }
}

/**
 * An error thrown when the lock fails to be released because it has been changed since the acquisition.
 * This should not happen and is a serious error.
 */
export class LockReleaseError extends Error {
  constructor(message = 'Failed to release the lock.') {
    super(message);
  }
}
