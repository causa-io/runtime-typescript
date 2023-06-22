import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotFoundErrorDto } from '../errors/index.js';
import { IdParams, VersionedMutationQuery } from '../validation/index.js';
import { MyErrorDto, MyResponseDto } from './dto.test.js';

@Controller('/some/path')
export class MyController {
  @Get('/')
  @ApiOperation({ description: '🔨' })
  @ApiOkResponse({ description: '💡', type: () => MyResponseDto })
  @ApiResponse({
    status: HttpStatus.I_AM_A_TEAPOT,
    description: '🚨',
    type: () => MyErrorDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '🔍',
    type: () => NotFoundErrorDto,
  })
  async get(
    @Param() { id }: IdParams,
    @Query() { updatedAt }: VersionedMutationQuery,
  ) {
    return { id, updatedAt };
  }
}
