import {
  IsUUID,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsArray,
} from 'class-validator'

export class AddJudgeDto {
  @IsUUID()
  userId!: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  displayName?: string

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  categoryIds?: string[]
}
