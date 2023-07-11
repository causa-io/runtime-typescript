import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsDate, IsInt, IsString } from 'class-validator';
import { AllowMissing, ValidateNestedType } from '../../validation/index.js';
import { ErrorDto } from '../errors/index.js';
import { ApiConstantProperty } from './api-constant-property.decorator.js';

export class SubDto {
  @ApiProperty({ description: '📆' })
  @IsDate()
  readonly dateProp!: Date;
}

export class MyResponseDto {
  @ApiProperty({ description: '📰' })
  @IsString()
  readonly stringProp!: string;

  @ApiProperty({ description: '1️⃣', required: false })
  @IsInt()
  @AllowMissing()
  readonly intProp?: number;

  @ApiConstantProperty({ description: '⛄', const: '🧊' })
  @Equals('🧊')
  readonly constProp!: '🧊';

  @ApiProperty({ description: '🧒' })
  @ValidateNestedType(() => SubDto)
  readonly subProp!: SubDto;
}

export class MyErrorDto extends ErrorDto {
  @ApiConstantProperty({ const: HttpStatus.I_AM_A_TEAPOT })
  readonly statusCode = HttpStatus.I_AM_A_TEAPOT;

  readonly message = '🛑 🫖';

  @ApiConstantProperty({ const: '🫖' })
  readonly errorCode = '🫖';
}
