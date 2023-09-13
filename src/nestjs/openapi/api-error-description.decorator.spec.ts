import { ErrorDto } from '../errors/index.js';
import {
  ApiErrorDescription,
  getApiErrorDescription,
} from './api-error-description.decorator.js';

describe('ApiErrorDescription', () => {
  it('should store the description', () => {
    @ApiErrorDescription('📚')
    class MyErrorDto extends ErrorDto {}

    const actualDescription = getApiErrorDescription(MyErrorDto);

    expect(actualDescription).toEqual('📚');
  });

  it('should throw an error if no description is found', () => {
    class MyErrorDto extends ErrorDto {}

    expect(() => getApiErrorDescription(MyErrorDto)).toThrow(
      `No API error description found for 'MyErrorDto'.`,
    );
  });
});
