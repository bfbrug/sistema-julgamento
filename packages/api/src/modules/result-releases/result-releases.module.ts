import { Module } from '@nestjs/common'
import { ResultReleasesService } from './result-releases.service'
import { ResultReleasesController } from './result-releases.controller'
import { ResultReleasesGateway } from './result-releases.gateway'
import { ReportsModule } from '../reports/reports.module'

@Module({
  imports: [ReportsModule],
  providers: [ResultReleasesService, ResultReleasesGateway],
  controllers: [ResultReleasesController],
  exports: [ResultReleasesGateway],
})
export class ResultReleasesModule {}
