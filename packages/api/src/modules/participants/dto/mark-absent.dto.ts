import { IsOptional, IsString, MaxLength } from 'class-validator'

export class MarkAbsentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}
