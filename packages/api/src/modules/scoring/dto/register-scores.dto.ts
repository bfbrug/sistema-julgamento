import { IsUUID, IsArray, ValidateNested, IsNumber, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class RegisterScoreItemDto {
  @IsUUID()
  categoryId: string

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(10) // O range real vem do evento, mas validamos o teto técnico
  value: number
}

export class RegisterScoresDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterScoreItemDto)
  scores: RegisterScoreItemDto[]
}
