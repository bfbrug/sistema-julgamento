import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min, IsEnum } from 'class-validator'
import { Gender } from '@prisma/client'

export class CreateParticipantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string

  @IsOptional()
  @IsInt()
  @Min(1)
  presentationOrder?: number

  @IsEnum(Gender, { message: 'Gênero inválido. Use MALE ou FEMALE.' })
  gender!: Gender
}
