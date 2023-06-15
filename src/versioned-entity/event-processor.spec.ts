import { jest } from '@jest/globals';
import 'jest-extended';
import { Event } from '../events/index.js';
import { VersionedEntityEventProcessor } from './event-processor.js';
import {
  MockRunner,
  MockTransaction,
  mockStateTransaction,
  mockTransaction,
} from './utils.test.js';
import { VersionedEntity } from './versioned-entity.js';

class MyEntity implements VersionedEntity {
  constructor(data: Partial<MyEntity> = {}) {
    Object.assign(this, {
      id: '123',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      someProperty: '👋',
      ...data,
    });
  }

  id!: string;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  someProperty!: string;
}

type MyEvent = Event<
  string,
  {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    originalProperty: string;
  }
>;

const projectionFn = ({ data }: Event) =>
  new MyEntity({
    id: data.id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    deletedAt: data.deletedAt,
    someProperty: data.originalProperty,
  });

describe('VersionedEntityEventProcessor', () => {
  let processor: VersionedEntityEventProcessor<
    MockTransaction,
    MyEvent,
    MyEntity
  >;

  beforeEach(() => {
    processor = new VersionedEntityEventProcessor(
      MyEntity,
      projectionFn,
      new MockRunner(),
    );
  });

  describe('isProjectionMoreRecentThanState', () => {
    it('should return true if the state does not exist', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        undefined,
      );
      const projection = new MyEntity();

      const actualIsMoreRecent =
        await processor.isProjectionMoreRecentThanState(projection, {
          transaction: mockTransaction,
        });

      expect(actualIsMoreRecent).toBeTrue();
      expect(
        mockStateTransaction.findOneWithSameKeyAs,
      ).toHaveBeenCalledExactlyOnceWith(MyEntity, projection);
    });

    it('should return true if the projection is more recent than the state', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ updatedAt: new Date('2020-01-01') }),
      );
      const projection = new MyEntity({ updatedAt: new Date('2020-01-02') });

      const actualIsMoreRecent =
        await processor.isProjectionMoreRecentThanState(projection);

      expect(actualIsMoreRecent).toBeTrue();
      expect(
        mockStateTransaction.findOneWithSameKeyAs,
      ).toHaveBeenCalledExactlyOnceWith(MyEntity, projection);
    });

    it('should return false if the projection is not more recent than the state', async () => {
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ updatedAt: new Date('2020-01-02') }),
      );
      const projection = new MyEntity({ updatedAt: new Date('2020-01-01') });

      const actualIsMoreRecent =
        await processor.isProjectionMoreRecentThanState(projection);

      expect(actualIsMoreRecent).toBeFalse();
      expect(
        mockStateTransaction.findOneWithSameKeyAs,
      ).toHaveBeenCalledExactlyOnceWith(MyEntity, projection);
    });
  });

  describe('processEvent', () => {
    it('should not update the state if the event is older', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-01'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-01'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ updatedAt: new Date('2020-01-02') }),
      );

      const actualWasProcessed = await processor.processEvent(event);

      expect(actualWasProcessed).toBeFalse();
      expect(mockStateTransaction.replace).not.toHaveBeenCalled();
    });

    it('should update the state if the event is more recent', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-02'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      mockStateTransaction.findOneWithSameKeyAs.mockResolvedValueOnce(
        new MyEntity({ updatedAt: new Date('2020-01-01') }),
      );
      const expectedEntity = projectionFn(event);

      const actualWasProcessed = await processor.processEvent(event);

      expect(actualWasProcessed).toBeTrue();
      expect(mockStateTransaction.replace).toHaveBeenCalledExactlyOnceWith(
        expectedEntity,
      );
      expect(mockStateTransaction.replace.mock.calls[0][0]).toBeInstanceOf(
        MyEntity,
      );
    });

    it('should skip the check and update the state', async () => {
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-02'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      const expectedEntity = projectionFn(event);

      const actualWasProcessed = await processor.processEvent(event, {
        skipVersionCheck: true,
      });

      expect(actualWasProcessed).toBeTrue();
      expect(mockStateTransaction.findOneWithSameKeyAs).not.toHaveBeenCalled();
      expect(mockStateTransaction.replace).toHaveBeenCalledExactlyOnceWith(
        expectedEntity,
      );
      expect(mockStateTransaction.replace.mock.calls[0][0]).toBeInstanceOf(
        MyEntity,
      );
    });
  });

  describe('updateState', () => {
    it('should allow overriding the updateState method', async () => {
      const updateStateSpy = jest.fn();
      class MyProcessor extends VersionedEntityEventProcessor<
        MockTransaction,
        MyEvent,
        MyEntity
      > {
        constructor() {
          super(MyEntity, projectionFn, new MockRunner());
        }

        async updateState(
          projection: MyEntity,
          transaction: MockTransaction,
        ): Promise<void> {
          updateStateSpy(projection, transaction);
        }
      }
      const event: MyEvent = {
        id: '123',
        name: '📫',
        producedAt: new Date('2020-01-02'),
        data: {
          id: '123',
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-02'),
          deletedAt: null,
          originalProperty: '👋',
        },
      };
      const expectedEntity = projectionFn(event);
      const processor = new MyProcessor();

      const actualWasProcessed = await processor.processEvent(event);

      expect(actualWasProcessed).toBeTrue();
      expect(updateStateSpy).toHaveBeenCalledExactlyOnceWith(
        expectedEntity,
        mockTransaction,
      );
      expect(updateStateSpy.mock.calls[0][0]).toBeInstanceOf(MyEntity);
    });
  });
});
