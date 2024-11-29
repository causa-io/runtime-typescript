import { jest } from '@jest/globals';
import { PinoLogger } from 'nestjs-pino';
import { setTimeout } from 'timers/promises';
import { getDefaultLogger } from '../../logging/index.js';
import { getLoggedErrors, spyOnLogger } from '../../testing.js';
import type { OutboxEvent } from './event.js';
import type { OutboxEventPublishResult } from './sender.js';
import { MockPublisher, MockSender } from './utils.test.js';

describe('OutboxEventSender', () => {
  let logger: PinoLogger;
  let publisher: MockPublisher;
  let sender: MockSender;
  let publishSpy: jest.SpiedFunction<MockPublisher['publish']>;
  let updateOutboxSpy: jest.SpiedFunction<
    (result: OutboxEventPublishResult) => Promise<void>
  >;
  let fetchEventsSpy: jest.SpiedFunction<() => Promise<OutboxEvent[]>>;

  beforeAll(() => {
    logger = new PinoLogger({ pinoHttp: { logger: getDefaultLogger() } });
    publisher = new MockPublisher();
    publishSpy = jest.spyOn(publisher, 'publish').mockResolvedValue();
    spyOnLogger();
  });

  beforeEach(() => {
    sender = new MockSender(publisher, logger, { pollingInterval: 0 });
    updateOutboxSpy = jest
      .spyOn(sender as any, 'updateOutbox')
      .mockResolvedValue(undefined);
    fetchEventsSpy = jest.spyOn(sender as any, 'fetchEvents');
  });

  describe('lifecycle', () => {
    let sender: MockSender | undefined;

    afterEach(async () => {
      await sender?.onApplicationShutdown();
      sender = undefined;
    });

    it('should not set an interval when the polling interval is 0', () => {
      sender = new MockSender(publisher, logger, { pollingInterval: 0 });

      expect((sender as any).pollingIntervalTimeout).toBeUndefined();
    });

    it('should set an interval when the polling interval is greater than 0', async () => {
      sender = new MockSender(publisher, logger, { pollingInterval: 50 });
      jest.spyOn(sender, 'pollOutbox');

      expect((sender as any).pollingIntervalTimeout).toBeDefined();
      await setTimeout(70);
      expect(sender.pollOutbox).toHaveBeenCalled();
    });

    it('should wait for the ongoing polling to finish before shutting down', async () => {
      sender = new MockSender(publisher, logger, { pollingInterval: 0 });
      jest.spyOn(sender, 'pollOutbox').mockImplementation(async () => {
        await setTimeout(100);
      });

      (sender as any).pollOutboxAtInterval();
      const actualPromise = sender.onApplicationShutdown();
      const actualFirstResult = await Promise.race([
        actualPromise,
        setTimeout(50, 'finishesFirst'),
      ]);

      expect(actualFirstResult).toBe('finishesFirst');
      await actualPromise;
      expect(sender.pollOutbox).toHaveBeenCalledExactlyOnceWith();
    });

    it('should wait for ongoing publishing to finish before shutting down', async () => {
      sender = new MockSender(publisher, logger, { pollingInterval: 0 });
      publishSpy.mockImplementation(async () => {
        await setTimeout(100);
      });

      sender.publish([
        { id: '1', topic: 'topic1', data: Buffer.from('🎉'), attributes: {} },
      ]);
      sender.publish([
        { id: '2', topic: 'topic2', data: Buffer.from('🎁'), attributes: {} },
      ]);
      const actualPromise = sender.onApplicationShutdown();
      const actualFirstResult = await Promise.race([
        actualPromise,
        setTimeout(50, 'finishesFirst'),
      ]);

      expect(actualFirstResult).toBe('finishesFirst');
      await actualPromise;
      expect(publisher.publish).toHaveBeenCalledTimes(2);
    });
  });

  describe('pollOutboxAtInterval', () => {
    it('should not start another polling when the last one is still running', async () => {
      fetchEventsSpy.mockImplementationOnce(async () => {
        await setTimeout(100);
        return [];
      });

      (sender as any).pollOutboxAtInterval();

      expect(fetchEventsSpy).toHaveBeenCalledExactlyOnceWith();
      expect((sender as any).ongoingPolling).toBeDefined();

      const actualPromise = (sender as any).pollOutboxAtInterval();

      expect((sender as any).ongoingPolling).toBeDefined();
      await (sender as any).ongoingPolling;
      expect(fetchEventsSpy).toHaveBeenCalledExactlyOnceWith();
      expect((sender as any).ongoingPolling).toBeUndefined();
      await actualPromise;
    });

    it('should not start polling when the application is shutting down', async () => {
      await sender.onApplicationShutdown();
      await (sender as any).pollOutboxAtInterval();

      expect(fetchEventsSpy).not.toHaveBeenCalled();
      expect((sender as any).ongoingPolling).toBeUndefined();
    });
  });

  describe('pollOutbox', () => {
    it('should fetch events and publish them', async () => {
      fetchEventsSpy.mockResolvedValueOnce([
        { id: '1', topic: 'topic1', data: Buffer.from('🎉'), attributes: {} },
        {
          id: '2',
          topic: 'topic2',
          data: Buffer.from('🎁'),
          attributes: { someKey: '🔑' },
        },
      ]);

      await sender.pollOutbox();

      expect(fetchEventsSpy).toHaveBeenCalledExactlyOnceWith();
      expect(publisher.publish).toHaveBeenCalledTimes(2);
      expect(publisher.publish).toHaveBeenCalledWith({
        topic: 'topic1',
        data: Buffer.from('🎉'),
        attributes: {},
      });
      expect(publisher.publish).toHaveBeenCalledWith({
        topic: 'topic2',
        data: Buffer.from('🎁'),
        attributes: { someKey: '🔑' },
      });
      expect(updateOutboxSpy).toHaveBeenCalledExactlyOnceWith({
        '1': true,
        '2': true,
      });
      expect(getLoggedErrors()).toBeEmpty();
    });

    it('should do nothing if there are no events to publish', async () => {
      await sender.pollOutbox();

      expect(fetchEventsSpy).toHaveBeenCalledExactlyOnceWith();
      expect(publisher.publish).not.toHaveBeenCalled();
      expect(updateOutboxSpy).not.toHaveBeenCalled();
      expect(getLoggedErrors()).toBeEmpty();
    });

    it('should log an error if fetching events fails', async () => {
      fetchEventsSpy.mockRejectedValueOnce(new Error('💥'));

      await sender.pollOutbox();

      expect(fetchEventsSpy).toHaveBeenCalledExactlyOnceWith();
      expect(publisher.publish).not.toHaveBeenCalled();
      expect(updateOutboxSpy).not.toHaveBeenCalled();
      expect(getLoggedErrors()).toEqual([
        expect.objectContaining({
          message: 'Failed to fetch events from the outbox.',
          error: expect.stringContaining('💥'),
        }),
      ]);
    });
  });

  describe('publish', () => {
    it('should publish events and update the outbox', async () => {
      await sender.publish([
        { id: '1', topic: 'topic1', data: Buffer.from('🎉'), attributes: {} },
        {
          id: '2',
          topic: 'topic2',
          data: Buffer.from('🎁'),
          attributes: { someKey: '🔑' },
        },
      ]);

      expect(publisher.publish).toHaveBeenCalledTimes(2);
      expect(publisher.publish).toHaveBeenCalledWith({
        topic: 'topic1',
        data: Buffer.from('🎉'),
        attributes: {},
      });
      expect(publisher.publish).toHaveBeenCalledWith({
        topic: 'topic2',
        data: Buffer.from('🎁'),
        attributes: { someKey: '🔑' },
      });
      expect(updateOutboxSpy).toHaveBeenCalledExactlyOnceWith({
        '1': true,
        '2': true,
      });
      expect(getLoggedErrors()).toBeEmpty();
    });

    it('should log an error if publishing fails and update the outbox', async () => {
      publishSpy.mockRejectedValueOnce(new Error('💥'));

      await sender.publish([
        { id: '1', topic: 'topic1', data: Buffer.from('🎉'), attributes: {} },
      ]);

      expect(publisher.publish).toHaveBeenCalledExactlyOnceWith({
        topic: 'topic1',
        data: Buffer.from('🎉'),
        attributes: {},
        key: undefined,
      });
      expect(updateOutboxSpy).toHaveBeenCalledExactlyOnceWith({ '1': false });
      expect(getLoggedErrors()).toEqual([
        expect.objectContaining({
          message: 'Failed to publish an event.',
          error: expect.stringContaining('💥'),
          outboxEventId: '1',
        }),
      ]);
    });

    it('should log an error if updating the outbox fails', async () => {
      updateOutboxSpy.mockRejectedValueOnce(new Error('💥'));

      await sender.publish([
        { id: '1', topic: 'topic1', data: Buffer.from('🎉'), attributes: {} },
      ]);

      expect(publisher.publish).toHaveBeenCalledExactlyOnceWith({
        topic: 'topic1',
        data: Buffer.from('🎉'),
        attributes: {},
        key: undefined,
      });
      expect(updateOutboxSpy).toHaveBeenCalledExactlyOnceWith({ '1': true });
      expect(getLoggedErrors()).toEqual([
        expect.objectContaining({
          message: 'Failed to update the outbox.',
          error: expect.stringContaining('💥'),
        }),
      ]);
    });

    it('should not start publishing when the application is shutting down', async () => {
      await sender.onApplicationShutdown();

      await sender.publish([
        { id: '1', topic: 'topic1', data: Buffer.from('🎉'), attributes: {} },
      ]);

      expect(publisher.publish).not.toHaveBeenCalled();
      expect(updateOutboxSpy).not.toHaveBeenCalled();
      expect(getLoggedErrors()).toBeEmpty();
    });
  });
});
