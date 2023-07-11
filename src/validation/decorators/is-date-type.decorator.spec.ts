import 'jest-extended';
import { parseObject } from '../parser.js';
import { IsDateType } from './is-date-type.decorator.js';

class MyObject {
  @IsDateType()
  myDate!: Date;

  @IsDateType({ each: true })
  myArrayOfDates!: Date[];
}

describe('IsDateType', () => {
  it('should transform and validate dates', async () => {
    const actualObject = await parseObject(MyObject, {
      myDate: '2021-01-01T00:00:00.000Z',
      myArrayOfDates: ['2021-01-01T00:00:00.000Z', '2021-01-02T00:00:00.000Z'],
    });

    expect(actualObject).toEqual({
      myDate: new Date('2021-01-01T00:00:00.000Z'),
      myArrayOfDates: [
        new Date('2021-01-01T00:00:00.000Z'),
        new Date('2021-01-02T00:00:00.000Z'),
      ],
    });
  });

  it('should not validate a single incorrect date', async () => {
    const actualPromise = parseObject(MyObject, {
      myDate: '📆',
      myArrayOfDates: [],
    });

    await expect(actualPromise).rejects.toMatchObject({
      validationMessages: expect.toSatisfy((messages: string[]) => {
        expect(messages).toEqual(['myDate must be a Date instance']);
        return true;
      }),
    });
  });

  it('should not validate an array of incorrect dates', async () => {
    const actualPromise = parseObject(MyObject, {
      myDate: new Date('2021-01-01T00:00:00.000Z'),
      myArrayOfDates: ['📆'],
    });

    await expect(actualPromise).rejects.toMatchObject({
      validationMessages: expect.toSatisfy((messages: string[]) => {
        expect(messages).toEqual([
          'each value in myArrayOfDates must be a Date instance',
        ]);
        return true;
      }),
    });
  });
});
