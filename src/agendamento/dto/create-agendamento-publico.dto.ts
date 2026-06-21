import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateAgendamentoPublicoDto {
  @ApiProperty({ description: 'ID do profissional' })
  @IsString()
  @IsNotEmpty()
  profissionalId: string;

  @ApiProperty({ description: 'Nome do profissional (usado nas mensagens de confirmação)' })
  @IsString()
  @IsNotEmpty()
  profissionalNome: string;

  @ApiProperty({ description: 'ID do serviço' })
  @IsString()
  @IsNotEmpty()
  servicoId: string;

  @ApiProperty({ example: '2026-06-22', description: 'Data no formato YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'data deve estar no formato YYYY-MM-DD.' })
  data: string;

  @ApiProperty({ example: '14:30', description: 'Hora no formato HH:MM' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'hora deve estar no formato HH:MM.' })
  hora: string;

  @ApiProperty({ description: 'Nome completo do paciente' })
  @IsString()
  @IsNotEmpty()
  pacienteNome: string;

  @ApiProperty({ description: 'Telefone/WhatsApp do paciente' })
  @IsString()
  @IsNotEmpty()
  pacienteTelefone: string;

  @ApiProperty({ description: 'CPF do paciente' })
  @IsString()
  @IsNotEmpty()
  pacienteCpf: string;

  @ApiProperty({ description: 'E-mail do paciente para confirmação' })
  @IsEmail({}, { message: 'pacienteEmail deve ser um e-mail válido.' })
  pacienteEmail: string;
}
