jest.mock('@whiskeysockets/baileys', () => ({}));
import { Test, TestingModule } from '@nestjs/testing';
import { AgendamentoService } from './agendamento.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../email/mail.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('AgendamentoService', () => {
  let service: AgendamentoService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgendamentoService,
        {
          provide: PrismaService,
          useValue: {
            agendamento: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            bloqueio: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            configuracaoAgenda: {
              findUnique: jest.fn().mockResolvedValue({
                abertura: '08:00',
                fechamento: '18:00',
                almoco_inicio: '12:00',
                almoco_fim: '13:00',
                ativo: true,
              }),
            },
          },
        },
        { provide: MailService, useValue: {} },
        { provide: WhatsappService, useValue: {} },
      ],
    }).compile();

    service = module.get<AgendamentoService>(AgendamentoService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('deve lançar um ConflictException se o horário já estiver ocupado', async () => {
    const dto = {
      data_inicio: '2026-03-24T14:00:00Z',
      data_fim: '2026-03-24T15:00:00Z',
      pacienteId: '123',
      servicoId: '456',
      profissionalId: 'mock-id',
    };

    // Simulamos que o Prisma ACHOU um agendamento existente
    jest.spyOn(prisma.agendamento, 'findFirst').mockResolvedValue(dto as any);

    // O teste espera que a função 'create' exploda com um BadRequestException
    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('deve criar um agendamento com sucesso se o horário estiver livre', async () => {
    const dto = {
      data_inicio: '2026-03-24T16:00:00Z',
      data_fim: '2026-03-24T17:00:00Z',
      pacienteId: '123',
      servicoId: '456',
      profissionalId: 'mock-id',
    };

    // Simulamos que o Prisma NÃO achou nada (horário vago)
    jest.spyOn(prisma.agendamento, 'findFirst').mockResolvedValue(null);
    const mockCreated = {
      ...dto,
      paciente: { nome: 'João', telefone: '11999999999' },
      servico: { nome: 'Botox' },
      profissional: { nome: 'Dra. Maria' }
    };
    jest.spyOn(prisma.agendamento, 'create').mockResolvedValue(mockCreated as any);

    const resultado = await service.create(dto);
    expect(resultado).toEqual(mockCreated);
  });

  it('deve lançar um BadRequestException se a data de fim for anterior à data de início', async () => {
  const dto = {
    data_inicio: '2026-03-24T15:00:00Z',
    data_fim: '2026-03-24T14:00:00Z', // Hora de fim ANTES da de início
    pacienteId: '123',
    servicoId: '456',
    profissionalId: 'mock-id',
  };

  // O teste espera que o service barre essa loucura
  await expect(service.create(dto)).rejects.toThrow(BadRequestException);
});
}); 