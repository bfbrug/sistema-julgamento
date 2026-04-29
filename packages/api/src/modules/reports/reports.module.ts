import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'
import { ReportsProcessor } from './reports.processor'
import { ReportsRepository } from './reports.repository'
import { RankingBuilderService } from './ranking-builder.service'
import { PdfService } from '../../services/pdf.service'
import { StorageModule } from '../storage/storage.module'
import { AuditModule } from '../audit/audit.module'
import { CalculationModule } from '../calculation/calculation.module'
import { DatabaseModule } from '../../config/database.module'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'reports' }),
    StorageModule,
    AuditModule,
    CalculationModule,
    DatabaseModule,
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsProcessor,
    ReportsRepository,
    RankingBuilderService,
    PdfService,
  ],
})
export class ReportsModule {}
