import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator'

export class UpdateSignatureDto {
  @IsString()
  @IsOptional()
  personName?: string

  @IsString()
  @IsOptional()
  personRole?: string

  @IsInt()
  @Min(1)
  @Max(3)
  @IsOptional()
  displayOrder?: number
}
