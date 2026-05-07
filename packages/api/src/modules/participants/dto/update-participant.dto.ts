import { IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator'
import { Gender } from '@prisma/client'

export class UpdateParticipantDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string

  @IsOptional()
  @IsEnum(Gender, { message: 'Gênero inválido. Use MALE ou FEMALE.' })
  gender?: Gender
}
