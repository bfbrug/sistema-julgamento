import { IsArray, IsString, IsNotEmpty, MaxLength, ArrayMinSize, ArrayMaxSize, IsEnum } from 'class-validator'
import { Gender } from '@prisma/client'

export class BulkCreateParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(255, { each: true })
  names!: string[]

  @IsEnum(Gender, { message: 'Gênero inválido. Use MALE ou FEMALE.' })
  gender!: Gender
}
