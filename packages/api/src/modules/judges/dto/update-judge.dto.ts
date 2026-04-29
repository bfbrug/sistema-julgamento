import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator'

export class UpdateJudgeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  displayName?: string
}
