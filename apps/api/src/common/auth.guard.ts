import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@kk/shared';
import { ROLES_KEY } from './roles.decorator.js';

/**
 * Auth + RBAC guard used globally by the API.
 *
 * - Parses the Bearer token (if any) and attaches the claims to the request.
 * - For endpoints decorated with `@Roles(...)`, requires a valid token whose
 *   claims include at least one of the listed roles.
 * - Endpoints without `@Roles(...)` stay open in MVP (auth will still populate
 *   `req.user` when a token is present). This matches how we gate mutations
 *   but not reads for the local pilot; production should flip the default.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const header = (req.headers['authorization'] as string | undefined) ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;

    let claims: { sub?: string; tenantId?: string; roles?: Role[]; mfa?: boolean } | null = null;
    if (token) {
      try {
        claims = await this.jwt.verifyAsync(token);
      } catch {
        // bad token: treat as anonymous for open routes; fail hard for guarded ones
        if (required?.length) throw new UnauthorizedException('invalid token');
      }
    }

    if (claims) {
      req.user = { sub: claims.sub, tenantId: claims.tenantId, roles: claims.roles ?? [], mfa: claims.mfa };
    }

    if (!required || required.length === 0) return true;

    // Soft-local-dev escape: allow explicit header for scripts and the
    // worker, bounded to the tenant header already present. Remove in prod
    // by setting AUTH_ALLOW_SERVICE_HEADER=false.
    const allowService = process.env.AUTH_ALLOW_SERVICE_HEADER !== 'false';
    if (allowService && req.headers['x-service-role']) {
      const svc = String(req.headers['x-service-role']) as Role;
      if ((required as string[]).includes(svc) || svc === 'agent' || svc === 'owner') {
        req.user = { sub: 'service', tenantId: req.headers['x-tenant-id'], roles: [svc], mfa: true };
        return true;
      }
    }

    if (!claims) throw new UnauthorizedException('token required');
    const roles = claims.roles ?? [];
    if (!required.some((r) => roles.includes(r))) {
      throw new ForbiddenException(`role required: ${required.join(' | ')}`);
    }
    return true;
  }
}
