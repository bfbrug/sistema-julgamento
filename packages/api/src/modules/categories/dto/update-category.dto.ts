import { IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator'
import { CategoryGenderMode } from '@prisma/client'

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string

  @IsOptional()
  @IsEnum(CategoryGenderMode, { message: 'Modo de gênero inválido.' })
  genderMode?: CategoryGenderMode
}
