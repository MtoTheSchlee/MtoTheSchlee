import { Controller, Get, Query } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { SearchService } from './search.service.js';

@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  search(@TenantId() tenantId: string, @Query('q') q = '', @Query('limit') limit?: string) {
    const n = Math.max(1, Math.min(50, Number(limit ?? 20)));
    return this.svc.global(tenantId, q, n);
  }
}
