import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator'

export class UpdateParticipantDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string
}
