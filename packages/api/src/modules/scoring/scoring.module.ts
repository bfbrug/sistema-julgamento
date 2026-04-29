import { Module } from '@nestjs/common'
import { ScoringService } from './scoring.service'
import { ScoringController } from './scoring.controller'
import { ScoringRepository } from './scoring.repository'
import { ScoringGateway } from './scoring.gateway'
import { AuditModule } from '../audit/audit.module'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule } from '@nestjs/config'
import { WsJwtGuard } from './guards/ws-jwt.guard'
import { CalculationModule } from '../calculation/calculation.module'

@Module({
  imports: [AuditModule, JwtModule, ConfigModule, CalculationModule],
  controllers: [ScoringController],
  providers: [
    ScoringService,
    ScoringRepository,
    ScoringGateway,
    WsJwtGuard,
  ],
  exports: [ScoringService, ScoringGateway],
})
export class ScoringModule {}
