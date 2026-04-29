import { IsArray, ValidateNested, IsUUID } from 'class-validator'
import { Type } from 'class-transformer'

export class ValidateMatrixCellDto {
  @IsUUID()
  judgeId!: string

  @IsUUID()
  categoryId!: string
}

export class ValidateMatrixDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateMatrixCellDto)
  cells!: ValidateMatrixCellDto[]
}
