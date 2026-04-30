import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { CertificatesController } from './certificates.controller'
import { CertificatesService } from './certificates.service'
import { CertificatesProcessor } from './certificates.processor'
import { CertificatesRepository } from './certificates.repository'
import { StorageModule } from '../storage/storage.module'
import { AuditModule } from '../audit/audit.module'
import { DatabaseModule } from '../../config/database.module'
import { PdfService } from '../../services/pdf.service'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'certificates' }),
    StorageModule,
    AuditModule,
    DatabaseModule,
  ],
  controllers: [CertificatesController],
  providers: [
    CertificatesService,
    CertificatesProcessor,
    CertificatesRepository,
    PdfService,
  ],
})
export class CertificatesModule {}
