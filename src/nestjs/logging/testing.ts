import { pino, type Logger } from 'pino';
import { getPinoConfiguration } from '../../logging/configuration.js';
import { getDefaultLogger } from '../../logging/logger.js';
import {
  getLoggedErrors,
  getLoggedInfos,
  getLoggedWarnings,
  spyOnLogger,
} from '../../testing.js';
import type { Fixture, NestJsModuleOverrider } from '../app/testing.js';
import { LOGGER_MODULE_OPTIONS_INJECTION_TOKEN } from './logger.module.js';

/**
 * A promise that resolves to a {@link Logger} using the `pino-pretty` formatter.
 * If `pino-pretty` is not installed, the promise resolves to `undefined`.
 */
const prettyLoggerPromise: Promise<Logger> = (async () => {
  try {
    const { default: pinoPretty } = await import('pino-pretty');
    return pino(
      { ...getPinoConfiguration(), level: 'debug' },
      (pinoPretty as any)({
        ignore: 'pid,hostname',
        colorize: true,
        levelFirst: true,
        translateTime: 'SYS:HH:MM:ss.l',
        destination: process.stdout,
      }),
    );
  } catch {
    return getDefaultLogger();
  }
})();

/**
 * Options for `expect*` methods in {@link LoggingFixture}.
 */
export type ExpectLogsOptions = {
  /**
   * Whether to check that the logs match exactly. If `false`, the logs are checked to include the expected logs, but
   * there may be additional logs and the order may differ.
   * Defaults to `true`.
   */
  exact?: boolean;
};

/**
 * A fixture that customizes and spies on the logger used in a NestJS application.
 * This can be used to prettify logs, and check for expected logs in tests.
 */
export class LoggingFixture implements Fixture {
  /**
   * Whether to prettify logs.
   * This requires `pino-pretty` to be installed.
   */
  readonly prettyLogs: boolean;

  /**
   * Whether to expect no errors in the logs each time the fixture is cleared.
   * If {@link LoggingFixture.expectErrors} is called, this becomes `false` until the next time the fixture is cleared.
   * Defaults to `true`.
   */
  readonly expectNoError: boolean;

  /**
   * Whether to expect no errors in the logs when {@link LoggingFixture.clear} is called.
   * This is reset during clearing.
   */
  private expectNoErrorOnClear: boolean;

  /**
   * The spied-on logger used in the application.
   */
  logger!: Logger;

  /**
   * Creates a new {@link LoggingFixture}.
   *
   * @param options Options for the fixture.
   */
  constructor(
    options: Partial<Pick<LoggingFixture, 'prettyLogs' | 'expectNoError'>> = {},
  ) {
    this.prettyLogs = options.prettyLogs ?? true;
    this.expectNoError = options.expectNoError ?? true;
    this.expectNoErrorOnClear = this.expectNoError;
  }

  async init(): Promise<NestJsModuleOverrider> {
    this.logger = this.prettyLogs
      ? await prettyLoggerPromise
      : getDefaultLogger();

    spyOnLogger(this.logger);

    return (builder) => {
      return builder
        .overrideProvider(LOGGER_MODULE_OPTIONS_INJECTION_TOKEN)
        .useValue({ logger: this.logger });
    };
  }

  async clear(): Promise<void> {
    if (this.expectNoErrorOnClear) {
      this.expectErrors([]);
    }

    this.expectNoErrorOnClear = this.expectNoError;
  }

  async delete(): Promise<void> {}

  /**
   * Expects the logged objects to match the expected objects.
   *
   * @param actual The actual logged objects.
   * @param expected The expected logged objects.
   * @param options Options for the expectation.
   */
  private expectLogs(
    actualFn: (options: object) => object[],
    expected: object | object[],
    options: ExpectLogsOptions = {},
  ) {
    const actual = actualFn({ logger: this.logger });
    const objects = Array.isArray(expected) ? expected : [expected];
    const expectedObjects = objects.map(expect.objectContaining);
    if (options.exact ?? true) {
      expect(actual).toEqual(expectedObjects);
    } else {
      expectedObjects.forEach((expectedObject) => {
        expect(actual).toContainEqual(expectedObject);
      });
    }
  }

  /**
   * Expects the logged errors to match the expected errors.
   * This also disables `expectNoError` until the next time {@link LoggingFixture.clear} is called.
   *
   * @param errors The expected logged errors.
   * @param options Options for the expectation.
   */
  expectErrors(
    errors: object | object[],
    options: ExpectLogsOptions = {},
  ): void {
    this.expectNoErrorOnClear = false;

    this.expectLogs(getLoggedErrors, errors, options);
  }

  /**
   * Expects the logged warnings to match the expected warnings.
   *
   * @param warnings The expected logged warnings.
   * @param options Options for the expectation.
   */
  expectWarnings(
    warnings: object | object[],
    options: ExpectLogsOptions = {},
  ): void {
    this.expectLogs(getLoggedWarnings, warnings, options);
  }

  /**
   * Expects the logged infos to match the expected infos.
   *
   * @param infos The expected logged infos.
   * @param options Options for the expectation.
   */
  expectInfos(infos: object | object[], options: ExpectLogsOptions = {}): void {
    this.expectLogs(getLoggedInfos, infos, options);
  }
}
