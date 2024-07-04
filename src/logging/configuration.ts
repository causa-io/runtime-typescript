import { readFile } from 'fs/promises';
import { LoggerOptions } from 'pino';

const packageDefinition = JSON.parse(await readFile('package.json', 'utf8'));
const serviceContext = {
  // Removes the (optional) scope from the name of the package.
  service: packageDefinition.name.split('/').at(-1),
  version: packageDefinition.version,
};

/**
 * Options that should be passed when initializing a `pino` logger.
 *
 * - It ensures the message will be contained in the `message` key.
 * - The `serviceContext` key is added.
 * - The `req.headers.authorization` key is redacted in all log objects.
 */
let pinoConfiguration: LoggerOptions = {
  messageKey: 'message',
  base: { serviceContext },
  redact: { paths: ['req.headers.authorization'] },
};

/**
 * Updates the pino configuration returned by {@link getPinoConfiguration}.
 * New options will be merged with the existing ones.
 * The {@link LoggerOptions.base} bindings will be merged, as well as the {@link LoggerOptions.redact.paths}.
 *
 * @param options Custom pino options to include in the existing configuration.
 */
export function updatePinoConfiguration(options: Partial<LoggerOptions>): void {
  const newRedactOptions = Array.isArray(options.redact)
    ? { paths: options.redact }
    : options.redact;
  const mergedRedactPaths = [
    ...new Set([
      ...(Array.isArray(pinoConfiguration.redact)
        ? pinoConfiguration.redact
        : pinoConfiguration.redact?.paths ?? []),
      ...(newRedactOptions?.paths ?? []),
    ]),
  ];

  pinoConfiguration = {
    ...pinoConfiguration,
    ...options,
    base: {
      ...pinoConfiguration.base,
      ...options.base,
    },
    redact: {
      ...pinoConfiguration.redact,
      ...newRedactOptions,
      paths: mergedRedactPaths,
    },
  };
}

/**
 * Returns the pino configuration that should be used by all services.
 * By default, it logs the message in the `message` key and adds the `serviceContext` key, containing the name and
 * version of the service, obtained from the `package.json` file.
 *
 * @returns The pino configuration.
 */
export function getPinoConfiguration(): LoggerOptions {
  return pinoConfiguration;
}
