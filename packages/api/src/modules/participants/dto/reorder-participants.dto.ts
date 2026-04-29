import { IsArray, ArrayMinSize, ValidateNested, IsUUID, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ReorderParticipantItemDto {
  @IsUUID()
  id!: string

  @IsInt()
  @Min(1)
  presentationOrder!: number
}

export class ReorderParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderParticipantItemDto)
  items!: ReorderParticipantItemDto[]
}
