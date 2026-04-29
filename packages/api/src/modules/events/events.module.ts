import { Module } from '@nestjs/common'
import { EventsController } from './events.controller'
import { EventsService } from './events.service'
import { EventsRepository } from './events.repository'
import { AuditModule } from '../audit/audit.module'
import { ScoringModule } from '../scoring/scoring.module'

@Module({
  imports: [AuditModule, ScoringModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
  exports: [EventsService, EventsRepository],
})
export class EventsModule {}
