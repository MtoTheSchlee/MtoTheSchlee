import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { TenantId } from '../common/tenant.decorator.js';
import { CustomersService } from './customers.service.js';

class CreateCustomerDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() type?: 'private' | 'b2b';
}

@Controller('customers')
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}

  @Get()
  list(@TenantId() tenantId: string, @Query('q') q?: string) {
    return this.svc.list(tenantId, q);
  }

  @Get(':id')
  one(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.byId(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateCustomerDto) {
    return this.svc.create(tenantId, dto);
  }
}
