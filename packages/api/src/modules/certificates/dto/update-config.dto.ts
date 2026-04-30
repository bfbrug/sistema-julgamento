import { IsString, MaxLength } from 'class-validator'

export class UpdateCertificateConfigDto {
  @IsString()
  @MaxLength(1500)
  certificateText!: string
}
