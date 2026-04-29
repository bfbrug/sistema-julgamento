import { IsEnum, IsOptional, IsBoolean } from 'class-validator'
import { EventStatus } from '@prisma/client'

export class TransitionEventDto {
  @IsEnum(EventStatus)
  targetStatus!: EventStatus

  @IsOptional()
  @IsBoolean()
  acknowledgeR2Coverage?: boolean
}
