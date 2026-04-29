import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min } from 'class-validator'

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string

  @IsOptional()
  @IsInt()
  @Min(1)
  displayOrder?: number
}
