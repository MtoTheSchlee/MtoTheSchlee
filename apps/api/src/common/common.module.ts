import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuditService } from './audit.service.js';
import { AuthGuard } from './auth.guard.js';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
      signOptions: { expiresIn: process.env.JWT_ACCESS_TTL ?? '15m' },
    }),
  ],
  providers: [AuditService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuditService, JwtModule],
})
export class CommonModule {}
