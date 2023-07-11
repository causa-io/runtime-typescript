import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsDateType } from '../../validation/index.js';

/**
 * A DTO object defining the HTTP request parameters used when accessing a single resource referenced by its UUID.
 */
export class IdParams {
  /**
   * The resource's UUID.
   */
  @ApiProperty({ description: `The resource's UUID.`, format: 'uuid' })
  @IsUUID(4)
  id!: string;
}

/**
 * A DTO object defining the HTTP request query used when mutating a resource, for which the client must provide the
 * current version of the resource.
 */
export class VersionedMutationQuery {
  /**
   * The known version of the resource.
   */
  @ApiProperty({ description: 'The known version of the resource.' })
  @IsDateType()
  updatedAt!: Date;
}
