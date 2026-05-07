import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator'
import { Gender } from '@prisma/client'

export class CreateResultReleaseDto {
  @IsUUID()
  categoryId!: string

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null

  @IsInt()
  @Min(1)
  position!: number
}
