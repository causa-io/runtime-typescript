import { DynamicModule, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  EVENT_PUBLISHER_INJECTION_NAME,
  InjectEventPublisher,
} from './publisher.decorator.js';

class MyService {
  constructor(@InjectEventPublisher() readonly publisher: any) {}
}
@Module({ providers: [MyService] })
class MyModule {}

const mockPublisher = {};
class EventPublisherModule {}
const providers = [
  {
    provide: EVENT_PUBLISHER_INJECTION_NAME,
    useValue: mockPublisher,
  },
];
const eventPublisherModule: DynamicModule = {
  module: EventPublisherModule,
  global: true,
  providers,
  exports: providers,
};

describe('InjectEventPublisher', () => {
  it('should inject the event publisher', async () => {
    const testModule = await Test.createTestingModule({
      imports: [eventPublisherModule, MyModule],
    }).compile();
    const service = testModule.get(MyService);

    const actualPublisher = service.publisher;

    expect(actualPublisher).toBe(mockPublisher);
  });
});
