import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  refreshToken!: string;
}
