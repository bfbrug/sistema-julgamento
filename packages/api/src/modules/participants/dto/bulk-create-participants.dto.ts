import { IsArray, IsString, IsNotEmpty, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator'

export class BulkCreateParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(255, { each: true })
  names!: string[]
}
