import { Module } from '@nestjs/common'
import { ParticipantsController } from './participants.controller'
import { ParticipantsService } from './participants.service'
import { ParticipantsRepository } from './participants.repository'
import { EventsModule } from '../events/events.module'
import { AuditModule } from '../audit/audit.module'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [EventsModule, AuditModule, StorageModule],
  controllers: [ParticipantsController],
  providers: [ParticipantsService, ParticipantsRepository],
  exports: [ParticipantsService, ParticipantsRepository],
})
export class ParticipantsModule {}
