import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Role {
  ADMIN = 'ADMIN',
  PROFISSIONAL = 'PROFISSIONAL',
}

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Dr. Lucas Silva' })
  @IsString()
  @IsNotEmpty()
  nome!: string; // ✨ Adicionado ! para resolver ts(2564)

  @ApiProperty({ example: 'lucas@bioschedule.com' })
  @IsEmail({}, { message: 'Forneça um e-mail válido' })
  @IsNotEmpty()
  email!: string; // ✨ Adicionado !

  @ApiProperty({ example: 'Senha123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  senha!: string; // ✨ Adicionado !

  @ApiProperty({ example: 'PROFISSIONAL', enum: Role })
  @IsEnum(Role, { message: 'Cargo inválido' })
  @IsOptional()
  role?: Role;
}