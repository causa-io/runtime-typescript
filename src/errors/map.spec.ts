import { tryMap } from './map.js';

class CustomError extends Error {}

function testFn(error?: unknown): string {
  if (error) {
    throw error;
  }

  return '🎉';
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
        { type: CustomError, value: '🚨' },
        { default: '🤷' },
      );

      expect(result).toBe('🤷');
    });

    it('should return the result of the default function if an error occurs', () => {
      const result = tryMap(
        () => testFn(new Error('💥')),
        { type: CustomError, value: '🚨' },
        { defaultFn: () => '🤷' },
      );

      expect(result).toBe('🤷');
    });

    it('should throw if no matching case is found', () => {
      expect(() => {
        tryMap(() => testFn(new Error('💥')), {
          type: CustomError,
          value: '🙅',
        });
      }).toThrow('💥');
    });

    it('should match the error type and return the corresponding value', () => {
      const result = tryMap(
        () => testFn(new CustomError('💥')),
        { type: CustomError, value: '🚨' },
        { type: Error, value: '🙅' },
        { default: '🤷' },
      );

      expect(result).toBe('🚨');
    });

    it('should match using a test function', () => {
      const result = tryMap(
        () => testFn(new Error('💥')),
        {
          test: (e): e is Error => e instanceof Error && e.message === '❓',
          value: '🙅',
        },
        {
          test: (e): e is Error => e instanceof Error && e.message === '💥',
          value: '🚨',
        },
      );

      expect(result).toBe('🚨');
    });

    it('should return the result of the value function', () => {
      const result = tryMap(
        () => testFn(new CustomError('🚨')),
        { type: CustomError, valueFn: (e: CustomError) => e.message },
        { type: Error, value: '🙅' },
      );

      expect(result).toBe('🚨');
    });

    it('should throw the result of the throw function', () => {
      expect(() => {
        tryMap(
          () => testFn(new CustomError('💥')),
          { type: CustomError, throw: () => new Error('🚨') },
          { type: Error, value: '🙅' },
        );
      }).toThrow('🚨');
    });
  });

  describe('promise', () => {
    it('should return the result of a resolved promise', async () => {
      const result = await tryMap(Promise.resolve('🎉'), { default: '🤷' });

      expect(result).toBe('🎉');
    });

    it('should return the default value if a promise is rejected', async () => {
      const result = await tryMap(
        Promise.reject(new Error('💥')),
        { type: CustomError, value: '🚨' },
        { default: '🤷' },
      );

      expect(result).toBe('🤷');
    });

    it('should rethrow the error if no matching case is found', async () => {
      const actualPromise = tryMap(Promise.reject(new Error('💥')), {
        type: CustomError,
        value: '🙅',
      });

      await expect(actualPromise).rejects.toThrow('💥');
    });
  });

  describe('async', () => {
    it('should return the result of an async function if no error occurs', async () => {
      const result = await tryMap(async () => '🎉', { default: '🤷' });

      expect(result).toBe('🎉');
    });

    it('should return the default value if an error occurs in an async function', async () => {
      const result = await tryMap(
        async () => {
          throw new Error('💥');
        },
        { type: CustomError, value: '🚨' },
        { default: '🤷' },
      );

      expect(result).toBe('🤷');
    });

    it('should rethrow the error if no matching case is found', async () => {
      const actualPromise = tryMap(
        async () => {
          throw new Error('💥');
        },
        { type: CustomError, value: '🙅' },
      );

      await expect(actualPromise).rejects.toThrow('💥');
    });
  });
});
