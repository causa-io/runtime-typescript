import 'jest-extended';
import { type Logger, pino } from 'pino';
import { getDefaultLogger } from './logger.js';
import {
  getLoggedErrors,
  getLoggedInfos,
  getLoggedObjects,
  getLoggedWarnings,
  spyOnLogger,
} from './testing.js';

describe('testing', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = pino();
    spyOnLogger(logger);
  });

  describe('spyOnLogger', () => {
    it('should return the spy', () => {
      const spy = spyOnLogger(logger);

      logger.info('👽');
      expect(spy).toHaveBeenCalledOnce();
    });

    it('should spy on the default logger', () => {
      const spy = spyOnLogger();

      getDefaultLogger().info('👽');
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('getLoggedObjects', () => {
    it('should return the logged messages', () => {
      logger.info('👽');
      logger.warn({ someKey: '🗝️' }, '👋');

      const actualLoggedMessages = getLoggedObjects({ logger });

      expect(actualLoggedMessages).toEqual([
        expect.objectContaining({ level: 30, msg: '👽' }),
        expect.objectContaining({ level: 40, someKey: '🗝️', msg: '👋' }),
      ]);
    });

    it('should only return the messages with the given level', () => {
      logger.info('👽');
      logger.warn('👋');

      const actualLoggedMessages = getLoggedObjects({ logger, level: 30 });

      expect(actualLoggedMessages).toEqual([
        expect.objectContaining({ level: 30, msg: '👽' }),
      ]);
    });

    it('should only return the messages that match the predicate', () => {
      logger.info('👽');
      logger.warn({ onlyThis: '✅' }, '👋');

      const actualLoggedMessages = getLoggedObjects({
        logger,
        predicate: ({ onlyThis }) => onlyThis === '✅',
      });

      expect(actualLoggedMessages).toEqual([
        expect.objectContaining({ msg: '👋' }),
      ]);
    });
  });

  describe('getLoggedInfos', () => {
    it('should return the logged infos', () => {
      logger.info('👽');
      logger.warn('👋');

      const actualLoggedInfos = getLoggedInfos({ logger });

      expect(actualLoggedInfos).toEqual([
        expect.objectContaining({ level: 30, msg: '👽' }),
      ]);
    });
  });

  describe('getLoggedWarnings', () => {
    it('should return the logged warnings', () => {
      logger.info('👽');
      logger.warn('👋');

      const actualLoggedWarnings = getLoggedWarnings({ logger });

      expect(actualLoggedWarnings).toEqual([
        expect.objectContaining({ level: 40, msg: '👋' }),
      ]);
    });
  });

  describe('getLoggedErrors', () => {
    it('should return the logged errors', () => {
      logger.info('👽');
      logger.error('👋');

      const actualLoggedErrors = getLoggedErrors({ logger });

      expect(actualLoggedErrors).toEqual([
        expect.objectContaining({ level: 50, msg: '👋' }),
      ]);
    });
  });
});
