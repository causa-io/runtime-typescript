import {
  orFallback,
  orFallbackFn,
  rethrow,
  rethrowIf,
  rethrowMessage,
  toNull,
  toValue,
  toValueFn,
  toValueFnIf,
  toValueIf,
  TryMap,
  tryMap,
} from './map.js';

class CustomError extends Error {}

function testFn(error?: unknown): string {
  if (error) {
    throw error;
  }

  return '🎉';
}

class MyClass {
  readonly value = '🎉';

  @TryMap(toValue(CustomError, '🚨'), orFallback('😌'))
  myMethod(error?: unknown): string {
    if (error) {
      throw error;
    }

    return this.value;
  }
}

describe('tryMap', () => {
  describe('sync', () => {
    it('should return the result of the function if no error occurs', () => {
      const result = tryMap(testFn, { default: '🤷' });
      expect(result).toBe('🎉');
    });

    it('should return the default value if an error occurs', () => {
      const result = tryMap(
        () => testFn(new Error('💥')),
        toValue(CustomError, '🚨'),
        orFallback('🤷'),
      );

      expect(result).toBe('🤷');
    });

    it('should return the result of the default function if an error occurs', () => {
      const result = tryMap(
        () => testFn(new Error('💥')),
        toValue(CustomError, '🚨'),
        orFallbackFn(() => '🤷'),
      );

      expect(result).toBe('🤷');
    });

    it('should throw if no matching case is found', () => {
      expect(() => {
        tryMap(() => testFn(new Error('💥')), toValue(CustomError, '🙅'));
      }).toThrow('💥');
    });

    it('should match the error type and return the corresponding value', () => {
      const result = tryMap(
        () => testFn(new CustomError('💥')),
        toValue(CustomError, '🚨'),
        toValue(Error, '🙅'),
        orFallback('🤷'),
      );

      expect(result).toBe('🚨');
    });

    it('should match the error type and return null', () => {
      const result = tryMap(
        () => testFn(new CustomError('💥')),
        toNull(CustomError),
        toValue(Error, '🙅'),
        orFallback('🤷'),
      );

      expect(result).toBeNull();
    });

    it('should match using a test function', () => {
      const result = tryMap(
        () => testFn(new Error('💥')),
        toValueIf(
          (e): e is Error => e instanceof Error && e.message === '❓',
          '🙅',
        ),
        toValueIf(
          (e): e is Error => e instanceof Error && e.message === '💥',
          '🚨',
        ),
      );

      expect(result).toBe('🚨');
    });

    it('should match using a test function and return the value from a function', () => {
      const result = tryMap(
        () => testFn(new Error('💥')),
        toValueFnIf(
          (e): e is Error => e instanceof Error && e.message === '❓',
          () => '🙅',
        ),
        toValueFnIf(
          (e): e is Error => e instanceof Error && e.message === '💥',
          (e) => `🚨: ${e.message}`,
        ),
      );

      expect(result).toBe('🚨: 💥');
    });

    it('should return the result of the value function', () => {
      const result = tryMap(
        () => testFn(new CustomError('🚨')),
        toValueFn(CustomError, (e) => e.message),
        toValue(Error, '🙅'),
      );

      expect(result).toBe('🚨');
    });

    it('should throw the result of the throw function', () => {
      expect(() => {
        tryMap(
          () => testFn(new CustomError('💥')),
          rethrow(CustomError, () => new Error('🚨')),
          toValue(Error, '🙅'),
        );
      }).toThrow('🚨');
    });

    it('should throw an base error with a message', () => {
      expect(() => {
        tryMap(
          () => testFn(new CustomError('💥')),
          rethrowMessage(CustomError, '🚨'),
          toValue(Error, '🙅'),
        );
      }).toThrow('🚨');
    });

    it('should match using a test function and throw the error', () => {
      expect(() => {
        tryMap(
          () => testFn(new Error('💥')),
          rethrowIf(
            (e): e is Error => e instanceof Error && e.message === '❓',
            () => new Error('🙅'),
          ),
          rethrowIf(
            (e): e is Error => e instanceof Error && e.message === '💥',
            (e) => new Error(`🚨: ${e.message}`),
          ),
        );
      }).toThrow('🚨: 💥');
    });
  });

  describe('promise', () => {
    it('should return the result of a resolved promise', async () => {
      const result = await tryMap(Promise.resolve('🎉'), orFallback('🤷'));

      expect(result).toBe('🎉');
    });

    it('should return the default value if a promise is rejected', async () => {
      const result = await tryMap(
        Promise.reject(new Error('💥')),
        toValue(CustomError, '🚨'),
        orFallback('🤷'),
      );

      expect(result).toBe('🤷');
    });

    it('should rethrow the error if no matching case is found', async () => {
      const actualPromise = tryMap(
        Promise.reject(new Error('💥')),
        toValue(CustomError, '🙅'),
      );

      await expect(actualPromise).rejects.toThrow('💥');
    });
  });

  describe('async', () => {
    it('should return the result of an async function if no error occurs', async () => {
      const result = await tryMap(async () => '🎉', orFallback('🤷'));

      expect(result).toBe('🎉');
    });

    it('should return the default value if an error occurs in an async function', async () => {
      const result = await tryMap(
        async () => {
          throw new Error('💥');
        },
        toValue(CustomError, '🚨'),
        orFallback('🤷'),
      );

      expect(result).toBe('🤷');
    });

    it('should rethrow the error if no matching case is found', async () => {
      const actualPromise = tryMap(
        async () => {
          throw new Error('💥');
        },
        toValue(CustomError, '🙅'),
      );

      await expect(actualPromise).rejects.toThrow('💥');
    });
  });

  describe('decorator', () => {
    const instance = new MyClass();

    it('should return the value from the decorated method', () => {
      const result = instance.myMethod();

      expect(result).toBe('🎉');
    });

    it('should return the default value if an error occurs in the decorated method', () => {
      const result = instance.myMethod(new Error('💥'));

      expect(result).toBe('😌');
    });

    it('should catch the error and return the corresponding value', () => {
      const result = instance.myMethod(new CustomError('💥'));

      expect(result).toBe('🚨');
    });
  });
});
