import { Expose, Type } from 'class-transformer'

class ParticipantCountsDto {
  @Expose() scoresRecorded!: number
  @Expose() scoresFinalized!: number
}

export class ParticipantResponseDto {
  @Expose() id!: string
  @Expose() eventId!: string
  @Expose() name!: string
  @Expose() photoUrl!: string | null
  @Expose() presentationOrder!: number
  @Expose() isAbsent!: boolean
  @Expose() currentState!: string
  @Expose() createdAt!: string
  @Expose() updatedAt!: string

  @Expose()
  @Type(() => ParticipantCountsDto)
  counts!: ParticipantCountsDto
}
