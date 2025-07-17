import type { Type } from '@nestjs/common';
import { isPromise } from 'util/types';

/**
 * An object that matches an error, either based on its type or using a custom test function.
 */
type ErrorMatcher<E> =
  | {
      /**
       * The type of the error to match.
       */
      type: Type<E>;
    }
  | {
      /**
       * A custom test function that checks if the error matches.
       */
      test: (e: unknown) => e is E;
    };

/**
 * An object that defines how to handle a matched error, either by returning a value, the result of a function, or
 * throwing a new error.
 */
type ErrorResult<T, E> =
  | {
      /**
       * The value to return when catching the error.
       */
      value: T;
    }
  | {
      /**
       * A function to evaluate and return the value when catching the error.
       */
      valueFn: (e: E) => T;
    }
  | {
      /**
       * A function to evaluate and throw the value when catching the error.
       * The function itself does not have to throw the error, only return an instance of it.
       */
      throw: (e: E) => any;
    };

/**
 * A default case that is used when no other case matches.
 */
type DefaultErrorCase<T> =
  | {
      /**
       * The default value to return when no other error case matches.
       */
      default: T;
    }
  | {
      /**
       * A function to evaluate and return the default value when no other error case matches.
       */
      defaultFn: (e: unknown) => T;
    };

/**
 * A case that defines to which type of error it applies and how to handle it.
 */
export type ErrorCase<T, E> =
  | (ErrorMatcher<E> & ErrorResult<T, E>)
  | DefaultErrorCase<T>;

/**
 * Handles a caught error based on the provided cases.
 * It will return the value of the first case that matches the error.
 * If no case matches, it will return the default case or throw the error if no default case is provided.
 *
 * @param error The caught error to handle.
 * @param cases The {@link ErrorCase}s to test.
 * @returns The value to return based on the matched case, or the default case if no match is found.
 */
function handleError<T>(error: unknown, cases: ErrorCase<T, any>[]): T {
  let defaultCase: DefaultErrorCase<T> | undefined;

  for (const c of cases) {
    if ('default' in c || 'defaultFn' in c) {
      defaultCase = c;
      continue;
    }

    if ('type' in c) {
      if (!(error instanceof c.type)) {
        continue;
      }
    } else {
      if (!c.test(error)) {
        continue;
      }
    }

    if ('throw' in c) {
      throw c.throw(error);
    }

    return 'valueFn' in c ? c.valueFn(error) : c.value;
  }

  if (!defaultCase) {
    throw error;
  }

  return 'defaultFn' in defaultCase
    ? defaultCase.defaultFn(error)
    : defaultCase.default;
}

/**
 * Wraps the given function in a try/catch block and evaluates the given error cases if needed.
 *
 * @param fn The function to execute that may throw an error.
 * @param cases The {@link ErrorCase}s to test against a caught error.
 */
export function tryMap<T>(fn: () => T, ...cases: ErrorCase<T, any>[]): T;
/**
 * Wraps the given function in a try/catch block, awaits the result, and evaluates the given error cases if it rejects.
 *
 * @param fn A promise that may reject with an error.
 * @param cases The {@link ErrorCase}s to test against a caught error.
 */
export function tryMap<T>(
  fn: () => Promise<T>,
  ...cases: ErrorCase<T, any>[]
): Promise<T>;
/**
 * Awaits the given promise and evaluates the given error cases if it rejects.
 *
 * @param promise A promise that may reject with an error.
 * @param cases The {@link ErrorCase}s to test against a caught error.
 */
export function tryMap<T>(
  promise: Promise<T>,
  ...cases: ErrorCase<T, any>[]
): Promise<T>;
export function tryMap<T>(
  fnOrPromise: (() => T | Promise<T>) | Promise<T>,
  ...cases: ErrorCase<T, any>[]
): T | Promise<T> {
  if (isPromise(fnOrPromise)) {
    return fnOrPromise.catch((error) => handleError(error, cases));
  }

  try {
    const result = fnOrPromise();

    if (!isPromise(result)) {
      return result;
    }

    return result.catch((error) => handleError(error, cases));
  } catch (error) {
    return handleError(error, cases);
  }
}

/**
 * Returns an {@link ErrorCase} that maps an error type to a value.
 *
 * @param type The type of the error to match.
 * @param value The value to return when catching the error.
 * @returns The {@link ErrorCase}.
 */
export function toValue<T, E>(type: Type<E>, value: T): ErrorCase<T, E> {
  return { type, value };
}

/**
 * Returns an {@link ErrorCase} that maps an error type to a value using a function.
 *
 * @param type The type of the error to match.
 * @param valueFn A function that takes the error and returns the value to return when catching the error.
 * @returns The {@link ErrorCase}.
 */
export function toValueFn<T, E>(
  type: Type<E>,
  valueFn: (e: E) => T,
): ErrorCase<T, E> {
  return { type, valueFn };
}

/**
 * Returns an {@link ErrorCase} that maps an error type to a value if the error matches a test function.
 *
 * @param test A function that checks if the error matches.
 * @param value The value to return when catching the error.
 * @returns The {@link ErrorCase}.
 */
export function toValueIf<T, E>(
  test: (e: unknown) => e is E,
  value: T,
): ErrorCase<T, E> {
  return { test, value };
}

/**
 * Returns an {@link ErrorCase} that maps an error type to a value using a function if the error matches a test
 * function.
 *
 * @param test A function that checks if the error matches.
 * @param valueFn A function that takes the error and returns the value to return when catching the error.
 * @returns The {@link ErrorCase}.
 */
export function toValueFnIf<T, E>(
  test: (e: unknown) => e is E,
  valueFn: (e: E) => T,
): ErrorCase<T, E> {
  return { test, valueFn };
}

/**
 * Returns an {@link ErrorCase} that matches an error type and returns null.
 *
 * @param type The type of the error to match.
 * @returns The {@link ErrorCase}.
 */
export function toNull<E>(type: Type<E>): ErrorCase<null, E> {
  return { type, value: null };
}

/**
 * Returns an {@link ErrorCase} that rethrows the error using a function creating the new error.
 *
 * @param type The type of the error to match.
 * @param throwFn A function that takes the error and returns a new error to throw.
 * @returns The {@link ErrorCase}.
 */
export function rethrow<E>(
  type: Type<E>,
  throwFn: (e: E) => Error,
): ErrorCase<never, E> {
  return { type, throw: throwFn };
}

/**
 * Returns an {@link ErrorCase} that rethrows the error using a base {@link Error} with a new message.
 *
 * @param type The type of the error to match.
 * @param message The message to use for the new error.
 * @returns The {@link ErrorCase}.
 */
export function rethrowMessage<E>(
  type: Type<E>,
  message: string,
): ErrorCase<never, E> {
  return { type, throw: () => new Error(message) };
}

/**
 * Returns an {@link ErrorCase} that rethrows the error using a function if the error matches a test function.
 *
 * @param test A function that checks if the error matches.
 * @param throwFn A function that takes the error and returns a new error to throw.
 * @returns The {@link ErrorCase}.
 */
export function rethrowIf<E>(
  test: (e: unknown) => e is E,
  throwFn: (e: E) => Error,
): ErrorCase<never, E> {
  return { test, throw: throwFn };
}

/**
 * Returns an {@link ErrorCase} that provides a default value when no other case matches.
 *
 * @param defaultValue The default value to return when no other case matches.
 * @returns The {@link DefaultErrorCase}.
 */
export function orFallback<T>(defaultValue: T): DefaultErrorCase<T> {
  return { default: defaultValue };
}

/**
 * Returns an {@link ErrorCase} that provides a default value using a function when no other case matches.
 *
 * @param defaultFn A function that takes the error and returns the default value when no other case matches.
 * @returns The {@link DefaultErrorCase}.
 */
export function orFallbackFn<T>(
  defaultFn: (e: unknown) => T,
): DefaultErrorCase<T> {
  return { defaultFn };
}

/**
 * Decorates a method to handle errors using the provided error cases.
 *
 * @param cases The {@link ErrorCase}s to handle.
 */
export function TryMap<T>(...cases: ErrorCase<T, any>[]): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ): void => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return tryMap(() => originalMethod.apply(this, args), ...cases);
    };
  };
}
