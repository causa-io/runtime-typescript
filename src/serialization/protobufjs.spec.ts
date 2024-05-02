import { jest } from '@jest/globals';
import { ProtobufjsObjectSerializer } from './protobufjs.js';

type FakeWriter = {
  finish(): Uint8Array;
};

class MyProto {
  constructor(init: MyProto) {
    Object.assign(this, init);
  }

  readonly prop1!: string;
  readonly prop2!: string;

  static encode(obj: object): FakeWriter {
    return {
      finish() {
        return Buffer.from(JSON.stringify(obj));
      },
    };
  }

  static decode(buffer: Uint8Array): MyProto {
    return new MyProto(JSON.parse(buffer.toString()));
  }
}

describe('ProtobufjsObjectSerializer', () => {
  let serializer: ProtobufjsObjectSerializer;
  let encodeSpy: jest.SpiedFunction<(typeof MyProto)['encode']>;
  let decodeSpy: jest.SpiedFunction<(typeof MyProto)['decode']>;

  beforeEach(() => {
    serializer = new ProtobufjsObjectSerializer();
    encodeSpy = jest.spyOn(MyProto, 'encode');
    decodeSpy = jest.spyOn(MyProto, 'decode');
  });

  it('should serialize and deserialize using Protobufjs-like methods', async () => {
    const obj = new MyProto({ prop1: '💮', prop2: '✨' });

    const actualBuffer = await serializer.serialize(obj);
    const actualInstance = await serializer.deserialize(MyProto, actualBuffer);

    expect(actualInstance).toBeInstanceOf(MyProto);
    expect(actualInstance).toEqual(obj);
    expect(encodeSpy).toHaveBeenCalledWith(obj);
    expect(decodeSpy).toHaveBeenCalledWith(actualBuffer);
  });
});
