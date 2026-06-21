import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';

import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: { agendamento: { findMany } },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Caso de borda (#8/#9): um atendimento às 22h de Brasília cai no dia seguinte em UTC.
  // O gráfico deve agrupá-lo no dia correto (Brasília), sem criar um bucket duplicado.
  it('agrupa atendimento noturno no dia correto de Brasília no gráfico', async () => {
    const atendimentoNoturno = {
      id: 'ag-1',
      // 22:00 de 20/06 em Brasília  ->  01:00Z de 21/06 em UTC
      data_inicio: new Date('2026-06-20T22:00:00-03:00'),
      status: 'CONCLUIDO',
      servico: { nome: 'Botox', valor: 100 },
      paciente: { nome: 'João' },
    };

    // 1ª chamada = período atual; 2ª chamada = período anterior (vazio)
    findMany.mockResolvedValueOnce([atendimentoNoturno]).mockResolvedValueOnce([]);

    const resumo = await service.getResumoPeriodo('2026-06-20', '2026-06-20');

    // Só deve existir o bucket do dia 20/06 — sem 21/06 fantasma
    expect(resumo.grafico).toHaveLength(1);
    const dia = resumo.grafico[0];
    expect(dia.label).toBe('20/06');
    expect(dia.atendimentos).toBe(1);
    expect(dia.faturamento).toBe(100);

    // Não pode existir rótulo do dia seguinte (bug antigo de fuso)
    expect(resumo.grafico.find((g) => g.label === '21/06')).toBeUndefined();
  });
});
