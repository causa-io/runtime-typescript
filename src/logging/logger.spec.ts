import { jest } from '@jest/globals';
import 'jest-extended';
import { createLogger, getDefaultLogger } from './logger.js';

describe('logger', () => {
  describe('createLogger', () => {
    it('should create a logger with the pinoConfiguration', () => {
      const loggedLines: object[] = [];
      const logger = createLogger({
        write: (msg) => loggedLines.push(JSON.parse(msg)),
      });

      logger.info('😎');

      expect(loggedLines[0]).toMatchObject({ message: '😎' });
    });

    it('should set the standard output and error in blocking mode', () => {
      const streams = [process.stdout, process.stderr] as any[];
      const originalHandles = streams.map((stream) => stream._handle);
      const mockHandles = streams.map(() => ({ setBlocking: jest.fn() }));
      streams.forEach((stream, i) => (stream._handle = mockHandles[i]));

      try {
        createLogger();
      } finally {
        streams.forEach((stream, i) => (stream._handle = originalHandles[i]));
      }

      mockHandles.forEach((handle) =>
        expect(handle.setBlocking).toHaveBeenCalledExactlyOnceWith(true),
      );
    });
  });

  describe('getDefaultLogger', () => {
    it('should expose a singleton', () => {
      const logger1 = getDefaultLogger();
      const logger2 = getDefaultLogger();

      expect(logger1).toBe(logger2);
    });
  });
});
