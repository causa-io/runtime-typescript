import { jest } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { DestinationStream, Logger, pino } from 'pino';
import type {
  getPinoConfiguration as getPinoConfigurationType,
  updatePinoConfiguration as updatePinoConfigurationType,
} from './configuration.js';

describe('configuration', () => {
  let tmpDir: string;
  let previousCwd: string;
  const loggedLines: any[] = [];
  const pinoStream: DestinationStream = {
    write: (msg) => loggedLines.push(JSON.parse(msg)),
  };
  let getPinoConfiguration: typeof getPinoConfigurationType;
  let updatePinoConfiguration: typeof updatePinoConfigurationType;

  beforeEach(async () => {
    jest.resetModules();
    tmpDir = resolve(await mkdtemp('runtime-test-'));
    previousCwd = process.cwd();
    process.chdir(tmpDir);
    await writeFile(
      'package.json',
      '{"name":"@my-org/my-service","version":"0.1.2"}',
    );
    loggedLines.splice(0, loggedLines.length);
    ({ getPinoConfiguration, updatePinoConfiguration } = await import(
      './configuration.js'
    ));
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('getPinoConfiguration', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = pino(getPinoConfiguration(), pinoStream);
    });

    it('should use message as the message key in the default configuration', () => {
      logger.info('👽');

      expect(loggedLines[0]).toMatchObject({ message: '👽' });
    });

    it('should include the service context in the default configuration', () => {
      logger.info('yo');

      expect(loggedLines[0]).toMatchObject({
        serviceContext: {
          service: 'my-service',
          version: '0.1.2',
        },
      });
    });
  });

  describe('updatePinoConfiguration', () => {
    it('should allow overriding options set in pinoConfiguration', () => {
      updatePinoConfiguration({ messageKey: 'otherKey' });

      const logger = pino(getPinoConfiguration(), pinoStream);
      logger.info('👽');
      expect(loggedLines[0]).toMatchObject({ otherKey: '👽' });
    });

    it('should merge base bindings', () => {
      updatePinoConfiguration({ base: { someOtherField: 'value' } });

      const logger = pino(getPinoConfiguration(), pinoStream);
      logger.info('👽');
      expect(loggedLines[0]).toMatchObject({
        message: '👽',
        someOtherField: 'value',
        serviceContext: {
          service: 'my-service',
          version: '0.1.2',
        },
      });
    });
  });
});
