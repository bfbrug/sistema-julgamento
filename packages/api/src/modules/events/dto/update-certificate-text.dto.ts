import { IsString, MaxLength } from 'class-validator'

export class UpdateCertificateTextDto {
  @IsString()
  @MaxLength(2000)
  text!: string
}
