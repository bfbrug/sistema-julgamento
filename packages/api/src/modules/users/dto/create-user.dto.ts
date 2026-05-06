import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { UserRole } from '@judging/shared'

export class CreateUserDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(3, { message: 'Username deve ter no mínimo 3 caracteres' })
  @MaxLength(50, { message: 'Username muito longo' })
  @Matches(/^[a-z0-9_]+$/, { message: 'Username: apenas letras minúsculas, números e _' })
  username!: string

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string

  @IsEnum(UserRole)
  role!: UserRole
}
