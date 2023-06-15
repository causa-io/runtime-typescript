import { EventTransaction, Transaction } from '../transaction/index.js';
import { VersionedEntityStateTransaction } from './state-transaction.js';

/**
 * A transaction that can be used to operate on versioned entities.
 */
export type VersionedEntityTransaction = Transaction<
  VersionedEntityStateTransaction,
  EventTransaction
>;
