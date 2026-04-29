import { Module } from '@nestjs/common'
import { EventsController } from './events.controller'
import { EventsService } from './events.service'
import { EventsRepository } from './events.repository'
import { PublicEventsController } from './public-events.controller'
import { PublicEventsService } from './public-events.service'
import { AuditModule } from '../audit/audit.module'
import { ScoringModule } from '../scoring/scoring.module'
import { CalculationModule } from '../calculation/calculation.module'

@Module({
  imports: [AuditModule, ScoringModule, CalculationModule],
  controllers: [EventsController, PublicEventsController],
  providers: [EventsService, EventsRepository, PublicEventsService],
  exports: [EventsService, EventsRepository],
})
export class EventsModule {}
