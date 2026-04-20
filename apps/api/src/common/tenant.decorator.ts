import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Pulls `x-tenant-id` from the request. For MVP we accept the header
 * directly; production attaches it via the Auth guard from JWT claims.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const headerTenant = (req.headers['x-tenant-id'] as string | undefined) ?? '';
    const userTenant = req.user?.tenantId as string | undefined;
    const tenantId =
      userTenant ||
      headerTenant ||
      process.env.TENANT_DEFAULT_ID ||
      '00000000-0000-0000-0000-000000000001';
    return tenantId;
  },
);
