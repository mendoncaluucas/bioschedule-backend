import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PacienteService {
  constructor(private prisma: PrismaService) {}

  async create(createPacienteDto: any) {
    return this.prisma.paciente.create({
      data: createPacienteDto,
    });
  }

  async findAll() {
    return this.prisma.paciente.findMany({
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id },
      include: {
        fotos: {
          orderBy: { criado_em: 'desc' } 
        },
        agendamentos: {
          include: {
            servico: true,
          },
          orderBy: {
            data_inicio: 'desc',
          }
        }
      }
    });

    if (!paciente) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    return paciente;
  }

  async update(id: string, updatePacienteDto: any) {
    await this.findOne(id);
    return this.prisma.paciente.update({
      where: { id },
      data: updatePacienteDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.paciente.delete({
      where: { id },
    });
  }

  async salvarFoto(pacienteId: string, fileUrl: string) {
    await this.findOne(pacienteId); 

    return this.prisma.fotoPaciente.create({
      data: {
        url: fileUrl,
        pacienteId: pacienteId,
      }
    });
  }

  async removerFoto(pacienteId: string, fotoId: string) {
    // 1. Verifica se o paciente existe antes de tentar deletar
    await this.findOne(pacienteId);

    // 2. Deleta o registro da foto no banco de dados
    return this.prisma.fotoPaciente.delete({
      where: { id: fotoId },
    });
  }
}