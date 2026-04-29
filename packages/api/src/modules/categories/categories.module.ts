import { Module } from '@nestjs/common'
import { CategoriesController } from './categories.controller'
import { CategoriesService } from './categories.service'
import { CategoriesRepository } from './categories.repository'
import { EventsModule } from '../events/events.module'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [EventsModule, AuditModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
  exports: [CategoriesService],
})
export class CategoriesModule {}
