import type { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Logger } from '../../nestjs/index.js';
import type { ReadOnlyStateTransaction } from '../state-transaction.js';
import {
  TransactionRunner,
  type ReadWriteTransactionOptions,
  type TransactionFn,
} from '../transaction-runner.js';
import {
  OutboxEventTransaction,
  type OutboxTransaction,
} from './event-transaction.js';
import type { OutboxEvent } from './event.js';
import { OutboxEventSender } from './sender.js';

/**
 * A base {@link TransactionRunner} implementing the outbox pattern.
 * Events are stored as part of the state transaction, and are published after the transaction is committed.
 * Events are removed from the outbox when publishing succeeds.
 */
export abstract class OutboxTransactionRunner<
  RWT extends OutboxTransaction & ROT,
  ROT extends ReadOnlyStateTransaction,
> extends TransactionRunner<RWT, ROT> {
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
   * @param eventTransactionFactory The function to call to create a new {@link OutboxEventTransaction} on each attempt.
   * @param options Options for the transaction.
   * @param runFn The function to run in the transaction.
   */
  protected abstract runStateTransaction<RT>(
    eventTransactionFactory: () => OutboxEventTransaction,
    options: ReadWriteTransactionOptions,
    runFn: TransactionFn<RWT, RT>,
  ): Promise<RT>;

  /**
   * Commits the events in the given {@link OutboxEventTransaction} to the state transaction.
   *
   * @param transaction The {@link OutboxTransaction} containing staged events in its {@link OutboxEventTransaction}.
   * @returns The {@link OutboxEvent}s that were written to the outbox as part of the transaction.
   */
  protected async commitEvents(transaction: RWT): Promise<OutboxEvent[]> {
    const stagedEvents = transaction.eventTransaction.events;
    if (stagedEvents.length === 0) {
      return [];
    }

    // Not based on the transaction timestamp because we don't know how long the transaction took.
    const leaseExpiration = new Date(Date.now() + this.sender.leaseDuration);
    const plainEvents = stagedEvents.map((e) => ({ ...e, leaseExpiration }));

    const events = plainToInstance(this.outboxEventType, plainEvents);

    await Promise.all(events.map((e) => transaction.set(e)));

    return events;
  }

  protected async runReadWrite<RT>(
    options: ReadWriteTransactionOptions,
    runFn: TransactionFn<RWT, RT>,
  ): Promise<RT> {
    this.logger.info('Starting a transaction.');

    const { result, events } = await this.runStateTransaction(
      () =>
        new OutboxEventTransaction(
          this.sender.publisher,
          options.publishOptions,
        ),
      options,
      async (transaction) => {
        this.logger.info('Starting transaction attempt.');

        const result = await runFn(transaction);

        const events = await this.commitEvents(transaction);

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

    return result;
  }
}
