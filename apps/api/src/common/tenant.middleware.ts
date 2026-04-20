import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Pre-request hook that sets `app.current_tenant` on the DB session so
 * row-level-security policies filter rows automatically.
 *
 * The middleware is a no-op when ENABLE_RLS is falsy, so local
 * developers can run without the role/policy setup. In production the
 * API connects as the `kkos_app` role which has no BYPASSRLS; the
 * session variable is the only way queries see any rows.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly log = new Logger('TenantMiddleware');
  private readonly enabled = process.env.ENABLE_RLS === 'true';

  constructor(private readonly prisma: PrismaService) {}

  async use(req: any, _res: any, next: (err?: unknown) => void) {
    if (!this.enabled) return next();
    const fallback = process.env.TENANT_DEFAULT_ID ?? '00000000-0000-0000-0000-000000000001';
    const tenantId =
      (req.user?.tenantId as string | undefined) ??
      (req.headers['x-tenant-id'] as string | undefined) ??
      fallback;
    try {
      // `set_config(name, value, is_local=true)` scopes the change to the
      // current transaction. For the top-level request this lives for the
      // whole request via Prisma's connection-reuse, which is the same
      // behaviour pgbouncer in transaction mode expects.
      await this.prisma.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant', $1, true)`,
        tenantId,
      );
    } catch (err) {
      // Fail closed when RLS is on: a request without a tenant shouldn't
      // get unfiltered rows.
      this.log.error({ err: String(err) }, 'failed to set tenant on session');
      return next(err);
    }
    next();
  }
}
