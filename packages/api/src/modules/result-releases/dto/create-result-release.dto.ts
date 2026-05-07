import { Gender } from '@prisma/client'
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator'

export class CreateResultReleaseDto {
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender

  @IsInt()
  @Min(1)
  position!: number
}
