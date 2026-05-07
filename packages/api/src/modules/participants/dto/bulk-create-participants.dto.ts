import { IsArray, IsString, IsNotEmpty, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator'
import { ParticipantResponseDto } from './participant-response.dto'

export class BulkCreateParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(255, { each: true })
  names!: string[]
}

export interface BulkCreateResult {
  created: number
  skipped: number
  participants: ParticipantResponseDto[]
}
