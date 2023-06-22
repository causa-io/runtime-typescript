import { SetMetadata } from '@nestjs/common';

/**
 * The metadata key that is added for public routes.
 */
export const PUBLIC_ROUTE_METADATA_KEY = 'isPublic';

/**
 * Sets the route(s) as public and does not check for the bearer token on it.
 * Can decorate a controller or one of its methods.
 */
export const Public = () => SetMetadata(PUBLIC_ROUTE_METADATA_KEY, true);
