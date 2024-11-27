import type { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Logger } from '../../nestjs/index.js';
import type { FindReplaceStateTransaction } from '../find-replace-transaction.js';
import { TransactionRunner } from '../transaction-runner.js';
import type { Transaction } from '../transaction.js';
import { OutboxEventTransaction } from './event-transaction.js';
import type { OutboxEvent } from './event.js';
import { OutboxEventSender } from './sender.js';

/**
 * A base {@link TransactionRunner} implementing the outbox pattern.
 * Events are stored as part of the state transaction, and are published after the transaction is committed.
 * Events are removed from the outbox when publishing succeeds.
 */
export abstract class OutboxTransactionRunner<
  T extends Transaction<FindReplaceStateTransaction, OutboxEventTransaction>,
> extends TransactionRunner<T> {
  /**
   * Creates a new {@link OutboxTransactionRunner}.
   *
   * @param outboxEventType The type for the entity representing an outbox event.
   * @param sender The {@link OutboxEventSender} to use to publish events from the outbox.
   * @param logger The {@link Logger} to use.
   */
  constructor(
    readonly outboxEventType: Type<OutboxEvent>,
    readonly sender: OutboxEventSender,
    readonly logger: Logger,
  ) {
    super();

    this.logger.setContext(OutboxTransactionRunner.name);
  }

  /**
   * Creates and runs the state transaction for the runner.
   * This should be implemented by subclasses, depending on the system used to store the state.
   *
   * @param eventTransaction The {@link OutboxEventTransaction} to use when creating the {@link Transaction}.
   * @param runFn The function to run in the transaction.
   */
  protected abstract runStateTransaction<RT>(
    eventTransaction: OutboxEventTransaction,
    runFn: (transaction: T) => Promise<RT>,
  ): Promise<RT>;

  /**
   * Commits the events in the given {@link OutboxEventTransaction} to the state transaction.
   *
   * @param stateTransaction The state transaction to commit the events to.
   * @param eventTransaction The {@link OutboxEventTransaction} containing the events.
   * @returns The {@link OutboxEvent}s that were committed as part of the state transaction.
   */
  protected async commitEvents(
    stateTransaction: T['stateTransaction'],
    eventTransaction: OutboxEventTransaction,
  ): Promise<OutboxEvent[]> {
    if (eventTransaction.events.length === 0) {
      return [];
    }

    // Not based on the transaction timestamp because we don't know how long the transaction took.
    const leaseExpiration = new Date(Date.now() + this.sender.leaseDuration);
    const plainEvents = eventTransaction.events.map((e) => ({
      ...e,
      leaseExpiration,
    }));

    const events = plainToInstance(this.outboxEventType, plainEvents);

    await Promise.all(events.map((e) => stateTransaction.replace(e)));

    return events;
  }

  async run<RT>(runFn: (transaction: T) => Promise<RT>): Promise<[RT]> {
    this.logger.info('Starting a transaction.');

    const eventTransaction = new OutboxEventTransaction(this.sender.publisher);

    const { result, events } = await this.runStateTransaction(
      eventTransaction,
      async (transaction) => {
        this.logger.info('Starting transaction attempt.');

        const result = await runFn(transaction);

        const events = await this.commitEvents(
          transaction.stateTransaction,
          transaction.eventTransaction,
        );

        this.logger.info(
          { numStagedEvents: events.length },
          'Committing the transaction.',
        );
        return { result, events };
      },
    );

    const numCommittedEvents = events.length;
    this.logger.info(
      { numCommittedEvents },
      'Successfully committed the transaction.',
    );

    if (numCommittedEvents > 0) {
      this.logger.info(
        { numTransactionEvents: numCommittedEvents },
        'Publishing transaction events.',
      );
      // This is not awaited on purpose, because publishing should happen in the background.
      this.sender.publish(events);
    }

    return [result];
  }
}
