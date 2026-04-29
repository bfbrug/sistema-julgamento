import { Module } from '@nestjs/common'
import { JudgesController } from './judges.controller'
import { JudgesService } from './judges.service'
import { JudgesRepository } from './judges.repository'
import { JudgeMatrixController } from './matrix/judge-matrix.controller'
import { JudgeMatrixService } from './matrix/judge-matrix.service'
import { EventsModule } from '../events/events.module'
import { CategoriesModule } from '../categories/categories.module'
import { UsersModule } from '../users/users.module'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [EventsModule, CategoriesModule, UsersModule, AuditModule],
  controllers: [JudgesController, JudgeMatrixController],
  providers: [JudgesService, JudgesRepository, JudgeMatrixService],
  exports: [JudgesService, JudgesRepository],
})
export class JudgesModule {}
