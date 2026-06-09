import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../email/mail.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { UpdateAgendamentoDto } from './dto/update-agendamento.dto';

@Injectable()
export class AgendamentoService {
  private readonly logger = new Logger(AgendamentoService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private whatsappService: WhatsappService,
  ) {}

  // ==========================================
  // VALIDAÇÃO DE REGRAS 
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

    const conflito = await this.prisma.agendamento.findFirst({
      where: {
        id: { not: ignorarId }, 
        profissionalId: profissionalId, 
        OR: [{ data_inicio: { lt: new Date(data_fim) }, data_fim: { gt: new Date(data_inicio) } }]
      }
    });
    
    if (conflito) throw new BadRequestException('Este profissional já possui um agendamento neste horário.');
  }

  // ==========================================
  // CRIAR AGENDAMENTO (Painel Admin)
  // ==========================================
  async create(dto: CreateAgendamentoDto) {
    await this.validarRegrasAgenda(dto.data_inicio, dto.data_fim, dto.profissionalId);

    return this.prisma.agendamento.create({
      data: {
        data_inicio: new Date(dto.data_inicio),
        data_fim: new Date(dto.data_fim),
        observacoes: dto.observacoes,
        status: 'AGENDADO',
        paciente: { connect: { id: dto.pacienteId } },
        servico: { connect: { id: dto.servicoId } },
        profissional: { connect: { id: dto.profissionalId } }
      },
      include: { paciente: true, servico: true, profissional: { select: { id: true, nome: true } } }
    });
  }

  // ==========================================
  // AGENDAMENTO PÚBLICO (Cliente Final)
  // ==========================================
  
  // ✨ NOVO: Busca apenas dados não sensíveis pelo CPF
  async buscarPacientePorCpf(cpf: string) {
    const paciente = await this.prisma.paciente.findUnique({
      where: { cpf },
      select: { nome: true, cpf: true, telefone: true, email: true }
    });
    
    if (!paciente) {
      throw new NotFoundException('Paciente não encontrado com este CPF.');
    }
    return paciente;
  }

  async agendarPublico(dados: {
    profissionalId: string;
    profissionalNome: string; 
    servicoId: string;
    data: string;
    hora: string;
    pacienteNome: string;
    pacienteTelefone: string;
    pacienteCpf: string; 
    pacienteEmail: string;
  }) {
    let paciente = await this.prisma.paciente.findUnique({
      where: { cpf: dados.pacienteCpf },
    });

    if (paciente) {
      const nomeNoBanco = paciente.nome.toLowerCase().trim();
      const nomeDigitado = dados.pacienteNome.toLowerCase().trim();

      if (nomeNoBanco !== nomeDigitado) {
        throw new ConflictException('Ops! Este CPF já está vinculado a outro nome em nosso sistema. Por favor, verifique os dados.');
      }

      paciente = await this.prisma.paciente.update({
        where: { id: paciente.id },
        data: { telefone: dados.pacienteTelefone, email: dados.pacienteEmail }
      });
    } else {
      paciente = await this.prisma.paciente.create({
        data: {
          nome: dados.pacienteNome,
          telefone: dados.pacienteTelefone,
          cpf: dados.pacienteCpf, 
          email: dados.pacienteEmail,
        },
      });
    }

    const servico = await this.prisma.servico.findUnique({
      where: { id: dados.servicoId },
    });

    if (!servico) throw new BadRequestException('Serviço não encontrado.');

    const dataInicio = new Date(`${dados.data}T${dados.hora}:00`);
    const dataFim = new Date(dataInicio.getTime() + servico.duracao_minutos * 60000);

    await this.validarRegrasAgenda(dataInicio.toISOString(), dataFim.toISOString(), dados.profissionalId);

    const novoAgendamento = await this.prisma.agendamento.create({
      data: {
        pacienteId: paciente.id,
        profissionalId: dados.profissionalId,
        servicoId: dados.servicoId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: 'AGENDADO',
      },
    });

    try {
      this.mailService.enviarConfirmacao({
        email: dados.pacienteEmail,
        nome: dados.pacienteNome,
        servico: servico.nome,
        profissional: dados.profissionalNome,
        data: dados.data.split('-').reverse().join('/'), 
        hora: dados.hora
      });
    } catch (err) {
      this.logger.error('Falha não crítica ao disparar e-mail:', err);
    }

    // Disparo WhatsApp (não-bloqueante, não-crítico)
    try {
      const dataFormatada = dados.data.split('-').reverse().join('/');
      await this.whatsappService.sendMessage(
        dados.pacienteTelefone,
        `✨ *BioSchedule - Confirmação de Agendamento*\n\n` +
        `Olá, ${dados.pacienteNome}! Seu horário foi confirmado:\n\n` +
        `📅 Data: ${dataFormatada}\n` +
        `⏰ Hora: ${dados.hora}\n` +
        `✂️ Procedimento: ${servico.nome}\n` +
        `👤 Profissional: ${dados.profissionalNome}\n\n` +
        `Qualquer dúvida, entre em contato conosco. Te esperamos! 💙`
      );
    } catch (err) {
      this.logger.error('Falha não crítica ao disparar WhatsApp:', err);
    }

    return novoAgendamento;
  }

  // ==========================================
  // BUSCAR HORÁRIOS LIVRES
  // ==========================================
  async listarHorariosDisponiveis(data: string, profissionalId: string) {
    const inicioDia = new Date(`${data}T00:00:00`);
    const fimDia = new Date(`${data}T23:59:59`);
    const diaSemana = inicioDia.getDay();

    const config = await this.prisma.configuracaoAgenda.findUnique({ where: { dia_semana: diaSemana } });
    if (!config || !config.ativo) return []; 

    const agendamentosOcupados = await this.prisma.agendamento.findMany({
      where: {
        profissionalId: profissionalId,
        data_inicio: { gte: inicioDia, lte: fimDia },
        status: { notIn: ['CANCELADO', 'FALTOU'] } 
      },
    });

    const [horaAbre] = config.abertura.split(':').map(Number);
    const [horaFecha] = config.fechamento.split(':').map(Number);
    const [horaAlmocoInicio] = config.almoco_inicio.split(':').map(Number);
    const [horaAlmocoFim] = config.almoco_fim.split(':').map(Number);

    const gradeTrabalho: string[] = [];
    for (let i = horaAbre; i < horaFecha; i++) {
      if (i >= horaAlmocoInicio && i < horaAlmocoFim) continue; 
      const horaFormatada = i.toString().padStart(2, '0') + ':00';
      gradeTrabalho.push(horaFormatada);
    }

    const horariosOcupadosFormatados = agendamentosOcupados.map(ag => {
      return ag.data_inicio.getHours().toString().padStart(2, '0') + ':' + ag.data_inicio.getMinutes().toString().padStart(2, '0');
    });

    return gradeTrabalho.filter(h => !horariosOcupadosFormatados.includes(h));
  }

  async findAll() {
    return this.prisma.agendamento.findMany({ 
      include: { paciente: true, servico: true, profissional: { select: { id: true, nome: true } } }, 
      orderBy: { data_inicio: 'asc' } 
    });
  }

  async findOne(id: string) {
    const agendamento = await this.prisma.agendamento.findUnique({ 
      where: { id }, 
      include: { paciente: true, servico: true, profissional: { select: { id: true, nome: true } } } 
    });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    return agendamento;
  }

  async update(id: string, dto: UpdateAgendamentoDto) {
    const agendamento = await this.findOne(id);
    const profissionalIdAUsar = dto.profissionalId || agendamento.profissionalId;

    if (dto.data_inicio && dto.data_fim) {
      await this.validarRegrasAgenda(dto.data_inicio, dto.data_fim, profissionalIdAUsar, id);
    }

    const updateData: any = { status: dto.status, observacoes: dto.observacoes };

    if (dto.data_inicio) updateData.data_inicio = new Date(dto.data_inicio);
    if (dto.data_fim) updateData.data_fim = new Date(dto.data_fim);
    if (dto.pacienteId) updateData.paciente = { connect: { id: dto.pacienteId } };
    if (dto.servicoId) updateData.servico = { connect: { id: dto.servicoId } };
    if (dto.profissionalId) updateData.profissional = { connect: { id: dto.profissionalId } };

    return this.prisma.agendamento.update({
      where: { id },
      data: updateData,
      include: { paciente: true, servico: true, profissional: { select: { id: true, nome: true } } }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.agendamento.delete({ where: { id } });
  }
}