import { IsArray, IsString, IsNotEmpty, MaxLength, ArrayMinSize, ArrayMaxSize, IsEnum, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { Gender } from '@prisma/client'

class BulkCreateParticipantItem {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string

  @IsEnum(Gender, { message: 'Gênero inválido. Use MALE ou FEMALE.' })
  gender!: Gender
}

export class BulkCreateParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BulkCreateParticipantItem)
  items!: BulkCreateParticipantItem[]
}
