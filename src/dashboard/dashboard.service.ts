import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getResumoPeriodo(inicio: string, fim: string) {
    const dataInicio = new Date(`${inicio}T00:00:00.000Z`);
    const dataFim = new Date(`${fim}T23:59:59.999Z`);

    // ========================================
    // 1. BUSCAR AGENDAMENTOS DO PERÍODO
    // ========================================
    const agendamentos = await this.prisma.agendamento.findMany({
      where: {
        data_inicio: { gte: dataInicio, lte: dataFim },
      },
      include: {
        servico: true,
        paciente: true,
      },
      orderBy: { data_inicio: 'asc' },
    });

    // ========================================
    // 2. MÉTRICAS DE VOLUME
    // ========================================
    const total = agendamentos.length;
    const concluidos = agendamentos.filter(a => a.status === 'CONCLUIDO');
    const cancelados = agendamentos.filter(a => a.status === 'CANCELADO');
    const faltas = agendamentos.filter(a => a.status === 'FALTOU');
    const pendentes = agendamentos.filter(
      a => a.status === 'AGENDADO' || a.status === 'CONFIRMADO',
    );

    // ========================================
    // 3. MÉTRICAS FINANCEIRAS
    // ========================================
    const faturamentoReal = concluidos.reduce(
      (acc, a) => acc + Number(a.servico.valor),
      0,
    );

    // Esperado = AGENDADO + CONFIRMADO + CONCLUIDO (exclui CANCELADO e FALTOU)
    const faturamentoEsperado = [...concluidos, ...pendentes].reduce(
      (acc, a) => acc + Number(a.servico.valor),
      0,
    );

    // Perdas = quanto se perdeu com cancelamentos e faltas
    const perdas = [...cancelados, ...faltas].reduce(
      (acc, a) => acc + Number(a.servico.valor),
      0,
    );

    const ticketMedio =
      concluidos.length > 0 ? faturamentoReal / concluidos.length : 0;

    const taxaConversao =
      total > 0 ? (concluidos.length / total) * 100 : 0;

    const taxaCancelamento =
      total > 0
        ? ((cancelados.length + faltas.length) / total) * 100
        : 0;

    // ========================================
    // 4. COMPARATIVO COM PERÍODO ANTERIOR
    // ========================================
    const duracaoMs = dataFim.getTime() - dataInicio.getTime();
    const inicioAnterior = new Date(dataInicio.getTime() - duracaoMs - 1);
    inicioAnterior.setUTCHours(0, 0, 0, 0);
    const fimAnterior = new Date(dataInicio.getTime() - 1);
    fimAnterior.setUTCHours(23, 59, 59, 999);

    const agendamentosAnteriores = await this.prisma.agendamento.findMany({
      where: {
        data_inicio: { gte: inicioAnterior, lte: fimAnterior },
      },
      include: { servico: true },
    });

    const totalAnterior = agendamentosAnteriores.length;
    const concluidosAnteriores = agendamentosAnteriores.filter(
      a => a.status === 'CONCLUIDO',
    );
    const faturamentoRealAnterior = concluidosAnteriores.reduce(
      (acc, a) => acc + Number(a.servico.valor),
      0,
    );

    const variacaoFaturamento =
      faturamentoRealAnterior > 0
        ? ((faturamentoReal - faturamentoRealAnterior) /
            faturamentoRealAnterior) *
          100
        : faturamentoReal > 0
          ? 100
          : 0;

    const variacaoAgendamentos =
      totalAnterior > 0
        ? ((total - totalAnterior) / totalAnterior) * 100
        : total > 0
          ? 100
          : 0;

    // ========================================
    // 5. TOP SERVIÇOS (RANKING POR FATURAMENTO)
    // ========================================
    const servicoMap = new Map<
      string,
      { nome: string; quantidade: number; faturamento: number }
    >();

    concluidos.forEach(a => {
      const nome = a.servico.nome;
      const existing = servicoMap.get(nome) || {
        nome,
        quantidade: 0,
        faturamento: 0,
      };
      existing.quantidade += 1;
      existing.faturamento += Number(a.servico.valor);
      servicoMap.set(nome, existing);
    });

    const topServicos = Array.from(servicoMap.values())
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 5);

    // ========================================
    // 6. DADOS PARA GRÁFICO (AGRUPADOS POR DIA)
    // ========================================
    const graficoMap = new Map<
      string,
      { atendimentos: number; faturamento: number }
    >();

    // Inicializar todos os dias do intervalo
    const cursor = new Date(dataInicio);
    while (cursor <= dataFim) {
      const label = cursor.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
      graficoMap.set(label, { atendimentos: 0, faturamento: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Preencher com dados reais (apenas não-cancelados)
    agendamentos
      .filter(a => a.status !== 'CANCELADO')
      .forEach(a => {
        const label = a.data_inicio.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
        const existing = graficoMap.get(label) || {
          atendimentos: 0,
          faturamento: 0,
        };
        existing.atendimentos += 1;
        if (a.status === 'CONCLUIDO') {
          existing.faturamento += Number(a.servico.valor);
        }
        graficoMap.set(label, existing);
      });

    const grafico = Array.from(graficoMap.entries()).map(([label, data]) => ({
      label,
      atendimentos: data.atendimentos,
      faturamento: data.faturamento,
    }));

    // ========================================
    // 7. PRÓXIMOS ATENDIMENTOS (MAX 10)
    // ========================================
    const proximosAtendimentos = agendamentos
      .filter(a => a.status === 'AGENDADO' || a.status === 'CONFIRMADO')
      .slice(0, 10)
      .map(a => ({
        id: a.id,
        hora: a.data_inicio.toISOString().substring(11, 16),
        data: a.data_inicio.toLocaleDateString('pt-BR'),
        paciente: a.paciente.nome,
        servico: a.servico.nome,
        valor: Number(a.servico.valor),
        status: a.status,
      }));

    // ========================================
    // RETORNO FINAL
    // ========================================
    return {
      periodo: { inicio, fim },

      metricas: {
        totalAgendamentos: total,
        concluidos: concluidos.length,
        cancelados: cancelados.length,
        faltas: faltas.length,
        pendentes: pendentes.length,
      },

      financeiro: {
        faturamentoReal,
        faturamentoEsperado,
        perdas,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        taxaConversao: Math.round(taxaConversao * 10) / 10,
        taxaCancelamento: Math.round(taxaCancelamento * 10) / 10,
      },

      comparativo: {
        faturamentoRealAnterior,
        variacaoFaturamento: Math.round(variacaoFaturamento * 10) / 10,
        totalAgendamentosAnterior: totalAnterior,
        variacaoAgendamentos: Math.round(variacaoAgendamentos * 10) / 10,
      },

      topServicos,
      grafico,
      proximosAtendimentos,
    };
  }
}