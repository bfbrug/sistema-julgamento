import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min } from 'class-validator'

export class CreateParticipantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string

  @IsOptional()
  @IsInt()
  @Min(1)
  presentationOrder?: number
}
