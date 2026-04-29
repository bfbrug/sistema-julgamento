import { IsOptional, IsUUID } from 'class-validator'

export class UpdateTiebreakerDto {
  @IsOptional()
  @IsUUID()
  firstCategoryId?: string

  @IsOptional()
  @IsUUID()
  secondCategoryId?: string
}
