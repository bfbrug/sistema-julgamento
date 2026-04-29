import { IsArray, ValidateNested, IsUUID } from 'class-validator'
import { Type } from 'class-transformer'

export class MatrixCell {
  @IsUUID()
  judgeId!: string

  @IsUUID()
  categoryId!: string
}

export class UpdateMatrixDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatrixCell)
  cells!: MatrixCell[]
}
