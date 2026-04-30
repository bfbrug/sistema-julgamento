import { IsArray, ArrayMinSize, ValidateNested, IsUUID, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ReorderItemDto {
  @IsUUID()
  id!: string

  @IsInt()
  @Min(1)
  displayOrder!: number
}

export class ReorderCategoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[]
}
