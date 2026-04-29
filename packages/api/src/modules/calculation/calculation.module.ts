import { Module } from '@nestjs/common'
import { CalculationController } from './calculation.controller'
import { CalculationService } from './calculation.service'
import { CalculationRepository } from './calculation.repository'
import { R1Strategy } from './strategies/r1-strategy'
import { R2Strategy } from './strategies/r2-strategy'
import { DatabaseModule } from '../../config/database.module'

@Module({
  imports: [DatabaseModule],
  controllers: [CalculationController],
  providers: [
    CalculationService,
    CalculationRepository,
    R1Strategy,
    R2Strategy,
  ],
  exports: [CalculationService],
})
export class CalculationModule {}
