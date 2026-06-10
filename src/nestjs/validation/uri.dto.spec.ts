import 'jest-extended';
import { randomUUID } from 'node:crypto';
import { ValidationError, parseObject } from '../../validation/index.js';
import { IdParams, VersionedMutationQuery } from './uri.dto.js';

describe('URI DTOs', () => {
  describe('IdParams', () => {
    it('should validate a correct UUID', async () => {
      const actualPromise = parseObject(IdParams, { id: randomUUID() });

      await expect(actualPromise).toResolve();
    });

    it('should not validate an incorrect UUID', async () => {
      const actualPromise = parseObject(IdParams, { id: '❌' });

      await expect(actualPromise).rejects.toThrow(ValidationError);
    });
  });

  describe('VersionedMutationQuery', () => {
    it('should validate a date', async () => {
      const expectedDate = new Date();

      const actualObject = await parseObject(VersionedMutationQuery, {
        updatedAt: expectedDate.toISOString(),
      });

      expect(actualObject).toEqual({ updatedAt: expectedDate });
    });

    it('should not validate a string other than a date', async () => {
      const actualPromise = parseObject(VersionedMutationQuery, {
        updatedAt: '📆',
      });

      await expect(actualPromise).rejects.toThrow(ValidationError);
    });
  });
});
