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
  });

  describe('getDefaultLogger', () => {
    it('should expose a singleton', () => {
      const logger1 = getDefaultLogger();
      const logger2 = getDefaultLogger();

      expect(logger1).toBe(logger2);
    });
  });
});
