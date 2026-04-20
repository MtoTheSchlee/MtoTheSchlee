import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { HealthController } from './health/health.controller.js';
import { TenantMiddleware } from './common/tenant.middleware.js';
import { AuthModule } from './auth/auth.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { AbModule } from './ab/ab.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { EmailsModule } from './emails/emails.module.js';
import { BoardModule } from './board/board.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { SocialModule } from './social/social.module.js';
import { AgentsModule } from './agents/agents.module.js';
import { SpeechModule } from './speech/speech.module.js';
import { SearchModule } from './search/search.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    RealtimeModule,
    AuthModule,
    CustomersModule,
    ProjectsModule,
    SuppliersModule,
    OrdersModule,
    AbModule,
    DocumentsModule,
    EmailsModule,
    BoardModule,
    AppointmentsModule,
    MetricsModule,
    SocialModule,
    AgentsModule,
    SpeechModule,
    SearchModule,
  ],
  controllers: [HealthController],
  providers: [TenantMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
