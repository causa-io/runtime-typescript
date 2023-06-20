import { Type } from 'class-transformer';
import { IsDate, IsUUID } from 'class-validator';

/**
 * A DTO object defining the HTTP request parameters used when accessing a single resource referenced by its UUID.
 */
export class IdParams {
  /**
   * The resource's UUID.
   */
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
  @Type(() => Date)
  @IsDate()
  updatedAt!: Date;
}
