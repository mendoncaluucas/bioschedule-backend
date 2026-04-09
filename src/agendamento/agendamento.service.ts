import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgendamentoService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // VALIDAÇÃO DE REGRAS (Com ajuste Multi-Profissional)
  // ==========================================
  private async validarRegrasAgenda(data_inicio: string, data_fim: string, profissionalId: string, ignorarId?: string) {
    const inicio = new Date(data_inicio);
    const diaSemana = inicio.getDay();
    const horaMinutoInicio = inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

    const config = await this.prisma.configuracaoAgenda.findUnique({ where: { dia_semana: diaSemana } });
    if (!config || !config.ativo) throw new BadRequestException('Clínica fechada neste dia.');

    if (horaMinutoInicio < config.abertura || horaMinutoInicio >= config.fechamento) {
      throw new BadRequestException(`Fora do expediente (${config.abertura} - ${config.fechamento}).`);
    }

    if (horaMinutoInicio >= config.almoco_inicio && horaMinutoInicio < config.almoco_fim) {
      throw new BadRequestException('Horário de almoço/pausa.');
    }

    // ✨ O PULO DO GATO: O conflito agora checa apenas o PROFISSIONAL selecionado!
    const conflito = await this.prisma.agendamento.findFirst({
      where: {
        id: { not: ignorarId }, // Ignora o próprio agendamento ao editar
        profissionalId: profissionalId, // Garante que a Dra. Maria não bloqueie o Dr. João
        OR: [{ data_inicio: { lt: new Date(data_fim) }, data_fim: { gt: new Date(data_inicio) } }]
      }
    });
    
    if (conflito) throw new BadRequestException('Este profissional já possui um agendamento neste horário.');
  }

  // ==========================================
  // CRIAR AGENDAMENTO
  // ==========================================
  async create(dto: any) {
    if (!dto.profissionalId) {
      throw new BadRequestException('O ID do profissional responsável pelo atendimento é obrigatório.');
    }

    // Passamos o profissionalId para a validação
    await this.validarRegrasAgenda(dto.data_inicio, dto.data_fim, dto.profissionalId);

    return this.prisma.agendamento.create({
      data: {
        data_inicio: new Date(dto.data_inicio),
        data_fim: new Date(dto.data_fim),
        observacoes: dto.observacoes,
        status: dto.status || 'AGENDADO',
        
        // Sintaxe do Prisma 7 (resolve o erro 'Argument paciente is missing')
        paciente: { connect: { id: dto.pacienteId } },
        servico: { connect: { id: dto.servicoId } },
        profissional: { connect: { id: dto.profissionalId } }
      },
      include: { 
        paciente: true, 
        servico: true,
        profissional: { select: { id: true, nome: true } } // Traz quem vai atender
      }
    });
  }

  // ==========================================
  // LISTAR AGENDAMENTOS
  // ==========================================
  async findAll() {
    return this.prisma.agendamento.findMany({ 
      include: { 
        paciente: true, 
        servico: true,
        profissional: { select: { id: true, nome: true } }
      }, 
      orderBy: { data_inicio: 'asc' } 
    });
  }

  // ==========================================
  // BUSCAR POR ID
  // ==========================================
  async findOne(id: string) {
    const agendamento = await this.prisma.agendamento.findUnique({ 
      where: { id }, 
      include: { 
        paciente: true, 
        servico: true,
        profissional: { select: { id: true, nome: true } }
      } 
    });
    
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    return agendamento;
  }

  // ==========================================
  // ATUALIZAR AGENDAMENTO
  // ==========================================
  async update(id: string, dto: any) {
    const agendamento = await this.findOne(id);
    
    // Pega o profissional novo (se veio no dto) ou mantém o antigo
    const profissionalIdAUsar = dto.profissionalId || agendamento.profissionalId;

    if (dto.data_inicio && dto.data_fim) {
      await this.validarRegrasAgenda(dto.data_inicio, dto.data_fim, profissionalIdAUsar, id);
    }

    // Monta o payload do Prisma de forma segura
    const updateData: any = {
      status: dto.status,
      observacoes: dto.observacoes,
    };

    if (dto.data_inicio) updateData.data_inicio = new Date(dto.data_inicio);
    if (dto.data_fim) updateData.data_fim = new Date(dto.data_fim);
    
    // Conecta os IDs caso tenham sido enviados para edição
    if (dto.pacienteId) updateData.paciente = { connect: { id: dto.pacienteId } };
    if (dto.servicoId) updateData.servico = { connect: { id: dto.servicoId } };
    if (dto.profissionalId) updateData.profissional = { connect: { id: dto.profissionalId } };

    return this.prisma.agendamento.update({
      where: { id },
      data: updateData,
      include: { 
        paciente: true, 
        servico: true,
        profissional: { select: { id: true, nome: true } } 
      }
    });
  }

  // ==========================================
  // DELETAR AGENDAMENTO
  // ==========================================
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.agendamento.delete({ where: { id } });
  }
}