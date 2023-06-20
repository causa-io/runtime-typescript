import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import {
  ApiOkResponse,
  DocumentBuilder,
  OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { createApp } from '../factory/index.js';

export async function generateOpenApiDocument(
  testModule: any,
): Promise<OpenAPIObject> {
  let app!: INestApplication;

  try {
    app = await createApp(testModule);

    const options = new DocumentBuilder().build();
    return SwaggerModule.createDocument(app, options);
  } finally {
    await app?.close();
  }
}

export function makeModuleWithResponseDto(dtoType: { new (): any }): any {
  @Controller('/')
  class MyController {
    @Get('/')
    @ApiOkResponse({ type: () => dtoType })
    async get(): Promise<any> {
      return {};
    }
  }

  @Module({
    controllers: [MyController],
  })
  class MyModule {}

  return MyModule;
}
