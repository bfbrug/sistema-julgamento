import { IsString, MinLength, MaxLength, IsOptional, IsInt, Min, IsEnum } from 'class-validator'
import { CategoryGenderMode } from '@prisma/client'

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string

  @IsOptional()
  @IsInt()
  @Min(1)
  displayOrder?: number

  @IsOptional()
  @IsEnum(CategoryGenderMode, { message: 'Modo de gênero inválido.' })
  genderMode?: CategoryGenderMode
}
