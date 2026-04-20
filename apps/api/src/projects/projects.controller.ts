import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { TenantId } from '../common/tenant.decorator.js';
import { ProjectsService } from './projects.service.js';
import type { ProjectStage } from '@prisma/client';

class CreateProjectDto {
  @IsString() customerId!: string;
  @IsString() title!: string;
}

@Controller('projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get() list(@TenantId() t: string) { return this.svc.list(t); }

  @Get(':id') one(@TenantId() t: string, @Param('id') id: string) {
    return this.svc.byId(t, id);
  }

  @Post()
  create(@TenantId() t: string, @Body() dto: CreateProjectDto) {
    return this.svc.create(t, dto);
  }

  @Patch(':id/stage')
  stage(
    @TenantId() t: string,
    @Param('id') id: string,
    @Body('stage') stage: ProjectStage,
  ) {
    return this.svc.updateStage(t, id, stage);
  }
}
