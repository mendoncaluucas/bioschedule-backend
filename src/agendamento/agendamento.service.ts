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
  // Converte string "HH:MM" para minutos desde meia-noite (sem usar toLocaleTimeString)
  private horaParaMinutos(horaStr: string): number {
    const [h, m] = horaStr.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private async validarRegrasAgenda(data_inicio: string, data_fim: string, profissionalId: string, ignorarId?: string) {
    const inicio = new Date(data_inicio);
    const fim = new Date(data_fim);
    const diaSemana = inicio.getDay();

    // Comparação numérica segura — sem toLocaleTimeString
    const minInicio = inicio.getUTCHours() * 60 + inicio.getUTCMinutes();

    const config = await this.prisma.configuracaoAgenda.findUnique({ where: { dia_semana: diaSemana } });
    if (!config || !config.ativo) throw new BadRequestException('Clínica fechada neste dia.');

    const minAbertura = this.horaParaMinutos(config.abertura);
    const minFechamento = this.horaParaMinutos(config.fechamento);
    const minAlmocoInicio = this.horaParaMinutos(config.almoco_inicio);
    const minAlmocoFim = this.horaParaMinutos(config.almoco_fim);

    if (minInicio < minAbertura || minInicio >= minFechamento) {
      throw new BadRequestException(`Fora do expediente (${config.abertura} - ${config.fechamento}).`);
    }

    if (minInicio >= minAlmocoInicio && minInicio < minAlmocoFim) {
      throw new BadRequestException('Horário de almoço/pausa.');
    }

    // Verificar conflito com bloqueios cadastrados
    const bloqueio = await this.prisma.bloqueio.findFirst({
      where: {
        data_inicio: { lt: fim },
        data_fim: { gt: inicio },
      },
    });
    if (bloqueio) throw new BadRequestException(`Horário bloqueado${bloqueio.motivo ? ': ' + bloqueio.motivo : '.'}`);

    // Verificar conflito com outros agendamentos do profissional
    const conflito = await this.prisma.agendamento.findFirst({
      where: {
        id: { not: ignorarId },
        profissionalId: profissionalId,
        status: { notIn: ['CANCELADO', 'FALTOU'] },
        data_inicio: { lt: fim },
        data_fim: { gt: inicio },
      }
    });

    if (conflito) throw new BadRequestException('Este profissional já possui um agendamento neste horário.');
  }

  // ==========================================
  // CRIAR AGENDAMENTO (Painel Admin)
  // ==========================================
  async create(dto: CreateAgendamentoDto) {
    await this.validarRegrasAgenda(dto.data_inicio, dto.data_fim, dto.profissionalId);

    const agendamento = await this.prisma.agendamento.create({
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

    // Disparar WhatsApp de confirmação (não-bloqueante)
    try {
      const dataObj = new Date(dto.data_inicio);
      const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

      await this.whatsappService.sendMessage(
        agendamento.paciente.telefone,
        `✨ *BioSchedule - Confirmação de Agendamento*\n\n` +
        `Olá, ${agendamento.paciente.nome}! Seu horário foi confirmado:\n\n` +
        `📅 Data: ${dataFormatada}\n` +
        `⏰ Hora: ${horaFormatada}\n` +
        `✂️ Procedimento: ${agendamento.servico.nome}\n` +
        `👤 Profissional: ${agendamento.profissional.nome}\n\n` +
        `Qualquer dúvida, entre em contato conosco. Te esperamos! 💙`
      );
    } catch (err) {
      this.logger.error('Falha não crítica ao disparar WhatsApp (admin):', err);
    }

    return agendamento;
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
  async listarHorariosDisponiveis(data: string, profissionalId: string, servicoId: string) {
    const inicioDia = new Date(`${data}T00:00:00`);
    const fimDia = new Date(`${data}T23:59:59`);
    const diaSemana = inicioDia.getDay();

    // 1. Verificar se a clínica abre neste dia
    const config = await this.prisma.configuracaoAgenda.findUnique({ where: { dia_semana: diaSemana } });
    if (!config || !config.ativo) return [];

    // 2. Buscar duração do serviço selecionado
    const servico = await this.prisma.servico.findUnique({ where: { id: servicoId } });
    if (!servico) return [];
    const duracaoMin = servico.duracao_minutos;
    const MARGEM_MIN = 10; // 10 min de preparo entre pacientes
    const GRANULARIDADE_MIN = 30; // slots a cada 30 minutos

    // 3. Converter horários de configuração para minutos
    const minAbertura = this.horaParaMinutos(config.abertura);
    const minFechamento = this.horaParaMinutos(config.fechamento);
    const minAlmocoInicio = this.horaParaMinutos(config.almoco_inicio);
    const minAlmocoFim = this.horaParaMinutos(config.almoco_fim);

    // 4. Buscar agendamentos ocupados do dia (excluindo cancelados e faltas)
    const agendamentosOcupados = await this.prisma.agendamento.findMany({
      where: {
        profissionalId,
        data_inicio: { gte: inicioDia, lte: fimDia },
        status: { notIn: ['CANCELADO', 'FALTOU'] },
      },
    });

    // 5. Buscar bloqueios que se sobrepõem ao dia
    const bloqueiosDoDia = await this.prisma.bloqueio.findMany({
      where: {
        data_inicio: { lt: fimDia },
        data_fim: { gt: inicioDia },
      },
    });

    // 6. Gerar slots a cada GRANULARIDADE_MIN dentro do expediente
    const slotsDisponiveis: string[] = [];

    for (let minSlot = minAbertura; minSlot + duracaoMin <= minFechamento; minSlot += GRANULARIDADE_MIN) {
      const minFimSlot = minSlot + duracaoMin;

      // Excluir slots que caem no horário de almoço
      if (minSlot < minAlmocoFim && minFimSlot > minAlmocoInicio) continue;

      // Montar Date objects do slot para comparação com bloqueios
      const slotInicio = new Date(`${data}T${String(Math.floor(minSlot / 60)).padStart(2, '0')}:${String(minSlot % 60).padStart(2, '0')}:00`);
      const slotFim = new Date(slotInicio.getTime() + duracaoMin * 60000);

      // Verificar conflito com bloqueios (overlap real)
      const bloqueado = bloqueiosDoDia.some(bl =>
        slotInicio < bl.data_fim && slotFim > bl.data_inicio
      );
      if (bloqueado) continue;

      // Verificar conflito com agendamentos existentes (overlap real + margem)
      const ocupado = agendamentosOcupados.some(ag => {
        const agInicioMin = ag.data_inicio.getHours() * 60 + ag.data_inicio.getMinutes();
        const agFimMin = ag.data_fim.getHours() * 60 + ag.data_fim.getMinutes() + MARGEM_MIN;
        // Slot colide se começa antes do fim (+ margem) do agendamento E termina depois do início
        return minSlot < agFimMin && minFimSlot > agInicioMin;
      });
      if (ocupado) continue;

      // Slot está livre — formatar e adicionar
      const h = String(Math.floor(minSlot / 60)).padStart(2, '0');
      const m = String(minSlot % 60).padStart(2, '0');
      slotsDisponiveis.push(`${h}:${m}`);
    }

    return slotsDisponiveis;
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