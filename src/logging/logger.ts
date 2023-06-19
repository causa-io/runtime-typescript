import { DestinationStream, Logger, destination, pino } from 'pino';
import { getPinoConfiguration } from './configuration.js';

/**
 * Creates a new logger using the configuration from {@link getPinoConfiguration}.
 *
 * @param stream The stream to which the logs should be written. Defaults to a synchronous pino stream.
 * @returns A logger instance.
 */
export function createLogger(stream?: DestinationStream): Logger {
  const options = getPinoConfiguration();
  stream = stream ?? destination({ sync: true });
  return pino(options, stream);
}

/**
 * The singleton logger that can be used when no other logger is available.
 */
let defaultLogger: Logger | null = null;

/**
 * Returns a singleton default logger that should be used in most cases.
 *
 * @returns The logger.
 */
export function getDefaultLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }

  return defaultLogger;
}
