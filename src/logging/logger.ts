import { type DestinationStream, type Logger, destination, pino } from 'pino';
import { getPinoConfiguration } from './configuration.js';

/**
 * Creates the default destination, which synchronously writes to the standard output.
 *
 * When the standard output is a pipe, Node sets it in non-blocking mode. Synchronous writes to a full pipe then fail
 * with `EAGAIN`, which pino handles by blocking the event loop for 100 ms before retrying. Putting the standard output
 * back in blocking mode makes writes only wait for as long as the reader needs. The standard error is also reset
 * because it may share the same pipe.
 *
 * @returns The destination stream.
 */
function createStdoutDestination(): DestinationStream {
  for (const stream of [process.stdout, process.stderr]) {
    // `_handle` is not defined for files, which are not affected. TTYs are already in blocking mode.
    (stream as any)._handle?.setBlocking?.(true);
  }

  return destination({ dest: 1, sync: true });
}

/**
 * Creates a new logger using the configuration from {@link getPinoConfiguration}.
 *
 * @param stream The stream to which the logs should be written. Defaults to a synchronous pino stream.
 * @returns A logger instance.
 */
export function createLogger(stream?: DestinationStream): Logger {
  const options = getPinoConfiguration();
  stream = stream ?? createStdoutDestination();
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
