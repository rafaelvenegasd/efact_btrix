import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password mínimo 6 caracteres' })
  password: string;
}

export class LoginResponseDto {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
