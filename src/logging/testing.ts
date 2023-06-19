import { jest } from '@jest/globals';
import { DestinationStream, Logger } from 'pino';
import { getDefaultLogger } from './logger.js';

/**
 * The description of the symbol used to retrieve the stream from a logger.
 * This is part of the private pino API and may break (although unlikely).
 */
const PINO_STREAM_SYMBOL_DESCRIPTION = 'pino.stream';

/**
 * Returns the {@link DestinationStream} used by the given {@link Logger}.
 * This uses the private pino API and may break.
 *
 * @param logger The logger from which to retrieve the stream.
 * @returns The stream used by the logger.
 */
function getLoggerStream(logger: Logger): DestinationStream {
  const streamSym = Object.getOwnPropertySymbols(logger).find(
    (sym) => sym.description === PINO_STREAM_SYMBOL_DESCRIPTION,
  );
  if (!streamSym) {
    throw new Error('Could not find stream symbol on logger.');
  }

  return (logger as any)[streamSym];
}

/**
 * Spies on the given logger, allowing the use of {@link getLoggedObjects} and related methods on it.
 *
 * @param logger The logger to spy on. Defaults to {@link getDefaultLogger}.
 * @returns The Jest spy on the logger's stream.
 */
export function spyOnLogger(
  logger?: Logger,
): jest.SpiedFunction<DestinationStream['write']> {
  logger = logger ?? getDefaultLogger();
  return jest.spyOn(getLoggerStream(logger), 'write');
}

/**
 * Options for the {@link getLoggedObjects} function.
 */
type GetLoggedObjectsOptions = {
  /**
   * The logger from which logs should be extracted. Defaults to {@link getDefaultLogger}.
   */
  logger?: Logger;

  /**
   * The level of the messages to return (`30` for info, `40` for warn, `50` for error).
   */
  level?: number;

  /**
   * A predicate used to filter the logged objects. This is applied in addition to filtering by level.
   */
  predicate?: (o: any) => boolean;
};

/**
 * Retrieves objects logged by `pino` from a spied-on stream/logger.
 * Use {@link spyOnLogger} during the setup of your tests to ensure the logged objects can be retrieved.
 *
 * @param options Options when getting the logged objects.
 * @returns A list of JavaScript objects corresponding to `pino` logs.
 */
export function getLoggedObjects(options: GetLoggedObjectsOptions = {}): any[] {
  const logger = options.logger ?? getDefaultLogger();
  const stream = getLoggerStream(logger);

  return (stream.write as jest.Mock).mock.calls
    .map((args) => args[0] as string)
    .join('')
    .split('\n')
    .filter((line) => line.length)
    .map((line) => JSON.parse(line))
    .filter((o) => {
      if (options.predicate && !options.predicate(o)) {
        return false;
      }

      if (options.level && o.level !== options.level) {
        return false;
      }

      return true;
    });
}

/**
 * Retrieves objects logged by `pino` at the info level.
 * See {@link getLoggedObjects}.
 *
 * @param options Options when getting the logged objects.
 * @returns A list of JavaScript objects for info logs.
 */
export function getLoggedInfos(
  options: Omit<GetLoggedObjectsOptions, 'level'> = {},
) {
  return getLoggedObjects({ ...options, level: 30 });
}

/**
 * Retrieves objects logged by `pino` at the warn level.
 * See {@link getLoggedObjects}.
 *
 * @param options Options when getting the logged objects.
 * @returns A list of JavaScript objects for info logs.
 */
export function getLoggedWarnings(
  options: Omit<GetLoggedObjectsOptions, 'level'> = {},
) {
  return getLoggedObjects({ ...options, level: 40 });
}

/**
 * Retrieves objects logged by `pino` at the error level.
 * See {@link getLoggedObjects}.
 *
 * @param options Options when getting the logged objects.
 * @returns A list of JavaScript objects for info logs.
 */
export function getLoggedErrors(
  options: Omit<GetLoggedObjectsOptions, 'level'> = {},
) {
  return getLoggedObjects({ ...options, level: 50 });
}
