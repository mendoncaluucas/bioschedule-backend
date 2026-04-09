import { IsString, IsNotEmpty, IsEmail, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePacienteDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty({ message: 'O nome não pode estar vazio' })
  nome: string;

  @ApiProperty({ example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  @Length(11, 14, { message: 'O CPF deve ter entre 11 e 14 caracteres' })
  cpf: string;

  @ApiProperty({ example: '47999999999' })
  @IsString()
  @IsNotEmpty()
  telefone: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsOptional() // Como o e-mail não é obrigatório no banco, usamos isso
  email?: string;

  // --- NOVO CAMPO DE ANOTAÇÕES DO PRONTUÁRIO ---
  @ApiPropertyOptional({ example: 'Paciente possui alergia a ácido retinóico.' })
  @IsString()
  @IsOptional() 
  observacoes?: string;
}