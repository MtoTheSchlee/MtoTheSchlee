import { SetMetadata } from '@nestjs/common';
import type { Role } from '@kk/shared';

export const ROLES_KEY = 'kk_roles';

/**
 * Mark an endpoint as requiring at least one of the listed roles.
 * Checked by RolesGuard using the JWT claims.
 *
 *   @Roles('purchaser', 'owner')
 *   @Post('/accept')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
