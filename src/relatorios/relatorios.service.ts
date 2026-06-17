import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit-table';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // HELPERS DE FORMATAÇÃO SEGURA
  // ==========================================

  private formatarDataSegura(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  private formatarHoraSegura(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }

  private formatarPeriodo(inicio: string, fim: string): string {
    const [aI, mI, dI] = inicio.split('-');
    const [aF, mF, dF] = fim.split('-');
    return `${dI}/${mI}/${aI} a ${dF}/${mF}/${aF}`;
  }

  private formatarEmissao(): string {
    return this.formatarDataSegura(new Date());
  }

  // ==========================================
  // BUSCA DOS DADOS
  // ==========================================

  private async getDadosDoRelatorio(tipo: string, inicio: string, fim: string) {
    let colunas: Array<{ header: string; key: string; width: number }> = [];
    let linhas: any[] = [];
    let titulo = '';
    let resumo: any = null;

    const dataInicio = new Date(`${inicio}T00:00:00.000Z`);
    const dataFim = new Date(`${fim}T23:59:59.999Z`);

    if (tipo === 'financeiro') {
      titulo = 'Relatório Financeiro — Faturamento';
      colunas = [
        { header: 'Data', key: 'data', width: 12 },
        { header: 'Paciente', key: 'paciente', width: 26 },
        { header: 'Procedimento', key: 'procedimento', width: 22 },
        { header: 'Profissional', key: 'profissional', width: 20 },
        { header: 'Valor (R$)', key: 'valor', width: 14 },
      ];

      const agendamentos = await this.prisma.agendamento.findMany({
        where: {
          data_inicio: { gte: dataInicio, lte: dataFim },
          status: 'CONCLUIDO',
        },
        include: {
          paciente: true,
          servico: true,
          profissional: { select: { nome: true } },
        },
        orderBy: { data_inicio: 'asc' },
      });

      linhas = agendamentos.map((ag) => ({
        data: this.formatarDataSegura(ag.data_inicio),
        paciente: ag.paciente.nome,
        procedimento: ag.servico.nome,
        profissional: ag.profissional.nome,
        valor: Number(ag.servico.valor),
        valorFormatado: `R$ ${Number(ag.servico.valor).toFixed(2).replace('.', ',')}`,
      }));

      const total = agendamentos.reduce((acc, ag) => acc + Number(ag.servico.valor), 0);
      const ticketMedio = agendamentos.length > 0 ? total / agendamentos.length : 0;

      const contagemServicos: Record<string, number> = {};
      agendamentos.forEach((ag) => {
        contagemServicos[ag.servico.nome] = (contagemServicos[ag.servico.nome] || 0) + 1;
      });
      const topServico = Object.entries(contagemServicos).sort((a, b) => b[1] - a[1])[0];

      resumo = {
        totalAtendimentos: agendamentos.length,
        totalFaturado: `R$ ${total.toFixed(2).replace('.', ',')}`,
        ticketMedio: `R$ ${ticketMedio.toFixed(2).replace('.', ',')}`,
        topServico: topServico ? `${topServico[0]} (${topServico[1]}x)` : '-',
      };

    } else if (tipo === 'agenda') {
      titulo = 'Relatório de Agendamentos';
      colunas = [
        { header: 'Data', key: 'data', width: 11 },
        { header: 'Hora', key: 'hora', width: 7 },
        { header: 'Paciente', key: 'paciente', width: 22 },
        { header: 'Procedimento', key: 'procedimento', width: 20 },
        { header: 'Profissional', key: 'profissional', width: 18 },
        { header: 'Status', key: 'status', width: 12 },
      ];

      const agendamentos = await this.prisma.agendamento.findMany({
        where: { data_inicio: { gte: dataInicio, lte: dataFim } },
        include: {
          paciente: true,
          servico: true,
          profissional: { select: { nome: true } },
        },
        orderBy: { data_inicio: 'asc' },
      });

      linhas = agendamentos.map((ag) => ({
        data: this.formatarDataSegura(ag.data_inicio),
        hora: this.formatarHoraSegura(ag.data_inicio),
        paciente: ag.paciente.nome,
        procedimento: ag.servico.nome,
        profissional: ag.profissional.nome,
        status: ag.status,
      }));

      resumo = {
        total: agendamentos.length,
        concluidos: agendamentos.filter((a) => a.status === 'CONCLUIDO').length,
        cancelados: agendamentos.filter((a) => a.status === 'CANCELADO').length,
        faltaram: agendamentos.filter((a) => a.status === 'FALTOU').length,
      };

    } else if (tipo === 'pacientes') {
      titulo = 'Relatório de Clientes Cadastrados';
      colunas = [
        { header: 'Nome', key: 'nome', width: 28 },
        { header: 'CPF', key: 'cpf', width: 16 },
        { header: 'Telefone', key: 'telefone', width: 16 },
        { header: 'E-mail', key: 'email', width: 26 },
        { header: 'Cadastro', key: 'cadastro', width: 13 },
      ];

      const pacientes = await this.prisma.paciente.findMany({
        where: { createdAt: { gte: dataInicio, lte: dataFim } },
        orderBy: { nome: 'asc' },
      });

      linhas = pacientes.map((p) => ({
        nome: p.nome,
        cpf: p.cpf,
        telefone: p.telefone,
        email: p.email || '-',
        cadastro: this.formatarDataSegura(p.createdAt),
      }));

      resumo = { total: pacientes.length };
    } else {
      throw new BadRequestException('Tipo de relatório inválido.');
    }

    return { titulo, colunas, linhas, resumo };
  }

  // ==========================================
  // PREVIEW
  // ==========================================

  async preview(tipo: string, inicio: string, fim: string): Promise<{ count: number }> {
    const dataInicio = new Date(`${inicio}T00:00:00.000Z`);
    const dataFim = new Date(`${fim}T23:59:59.999Z`);

    if (tipo === 'financeiro') {
      const count = await this.prisma.agendamento.count({
        where: { data_inicio: { gte: dataInicio, lte: dataFim }, status: 'CONCLUIDO' },
      });
      return { count };
    } else if (tipo === 'agenda') {
      const count = await this.prisma.agendamento.count({
        where: { data_inicio: { gte: dataInicio, lte: dataFim } },
      });
      return { count };
    } else if (tipo === 'pacientes') {
      const count = await this.prisma.paciente.count({
        where: { createdAt: { gte: dataInicio, lte: dataFim } },
      });
      return { count };
    }
    return { count: 0 };
  }

  // ==========================================
  // EXPORTAR EXCEL
  // ==========================================

  async exportarExcel(tipo: string, inicio: string, fim: string): Promise<Buffer> {
    const { titulo, colunas, linhas, resumo } = await this.getDadosDoRelatorio(tipo, inicio, fim);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BioSchedule';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Relatório');
    const totalCols = colunas.length;

    // Linha 1: Título
    worksheet.mergeCells(1, 1, 1, totalCols);
    const tituloCell = worksheet.getCell('A1');
    tituloCell.value = `BioSchedule — ${titulo}`;
    tituloCell.font = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    tituloCell.alignment = { horizontal: 'center', vertical: 'middle' };
    tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    worksheet.getRow(1).height = 28;

    // Linha 2: Período
    worksheet.mergeCells(2, 1, 2, totalCols);
    const periodoCell = worksheet.getCell('A2');
    periodoCell.value = `Período: ${this.formatarPeriodo(inicio, fim)}   |   Emitido em: ${this.formatarEmissao()}`;
    periodoCell.font = { name: 'Calibri', italic: true, size: 10, color: { argb: 'FF334155' } };
    periodoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    periodoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    worksheet.getRow(2).height = 18;

    // Linha 3: Cabeçalho
    worksheet.columns = colunas.map((c) => ({ key: c.key, width: c.width }));
    const headerRow = worksheet.getRow(3);
    colunas.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1D4ED8' } },
        bottom: { style: 'thin', color: { argb: 'FF1D4ED8' } },
        left: { style: 'thin', color: { argb: 'FF1D4ED8' } },
        right: { style: 'thin', color: { argb: 'FF1D4ED8' } },
      };
    });
    headerRow.height = 22;

    // Auto-filtro
    worksheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3, column: totalCols },
    };

    // Dados
    linhas.forEach((item, rowIndex) => {
      const row = worksheet.addRow(
        colunas.map((col) => {
          if (col.key === 'valor' && typeof item.valor === 'number') return item.valor;
          return item[col.key];
        }),
      );

      const isZebra = rowIndex % 2 === 0;
      row.eachCell((cell, colNumber) => {
        const col = colunas[colNumber - 1];

        if (col?.key === 'valor') {
          cell.numFmt = '"R$" #,##0.00';
        }

        if (col?.key === 'status') {
          const cores: Record<string, string> = {
            CONCLUIDO: 'FF166534', CANCELADO: 'FF991B1B',
            FALTOU: 'FF92400E', AGENDADO: 'FF1E40AF', CONFIRMADO: 'FF065F46',
          };
          cell.font = { name: 'Calibri', size: 10, color: { argb: cores[String(cell.value)] || 'FF334155' } };
        } else {
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
        }

        cell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: isZebra ? 'FFF8FAFC' : 'FFFFFFFF' },
        };
        cell.border = {
          top: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          left: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          right: { style: 'hair', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = { vertical: 'middle' };
      });
      row.height = 18;
    });

    // Rodapé financeiro
    if (tipo === 'financeiro' && resumo) {
      worksheet.addRow([]);
      const totalRow = worksheet.addRow(
        colunas.map((col) => {
          if (col.key === 'procedimento') return 'TOTAL FATURADO:';
          if (col.key === 'valor') return linhas.reduce((acc, l) => acc + (l.valor || 0), 0);
          return '';
        }),
      );
      totalRow.eachCell((cell, colNumber) => {
        const col = colunas[colNumber - 1];
        if (col?.key === 'valor') cell.numFmt = '"R$" #,##0.00';
        cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF1D4ED8' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
        cell.border = { top: { style: 'medium', color: { argb: 'FF2563EB' } }, bottom: { style: 'medium', color: { argb: 'FF2563EB' } } };
      });
      totalRow.height = 22;

      worksheet.addRow([]);
      const resumoRow = worksheet.addRow(['']);
      worksheet.mergeCells(resumoRow.number, 1, resumoRow.number, totalCols);
      const rCell = resumoRow.getCell(1);
      rCell.value = `Atendimentos: ${resumo.totalAtendimentos}   |   Ticket Médio: ${resumo.ticketMedio}   |   Top Serviço: ${resumo.topServico}`;
      rCell.font = { name: 'Calibri', italic: true, size: 10, color: { argb: 'FF475569' } };
      rCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      rCell.alignment = { horizontal: 'center' };
    }

    if (tipo === 'agenda' && resumo) {
      worksheet.addRow([]);
      const aRow = worksheet.addRow(['']);
      worksheet.mergeCells(aRow.number, 1, aRow.number, totalCols);
      const aCell = aRow.getCell(1);
      aCell.value = `Total: ${resumo.total}   |   Concluídos: ${resumo.concluidos}   |   Cancelados: ${resumo.cancelados}   |   Faltaram: ${resumo.faltaram}`;
      aCell.font = { name: 'Calibri', italic: true, size: 10, color: { argb: 'FF475569' } };
      aCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      aCell.alignment = { horizontal: 'center' };
    }

    const result = await workbook.xlsx.writeBuffer();
    return Buffer.from(result);
  }

  // ==========================================
  // EXPORTAR PDF
  // ==========================================

  async exportarPdf(tipo: string, inicio: string, fim: string): Promise<Buffer> {
    const { titulo, colunas, linhas, resumo } = await this.getDadosDoRelatorio(tipo, inicio, fim);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageW = doc.page.width;   // 595.28pt
      const margin = 40;
      const contentW = pageW - margin * 2; // 515.28pt

      // -------------------------------------------------------
      // CABEÇALHO — faixa azul
      // -------------------------------------------------------
      doc.rect(0, 0, pageW, 88).fill('#1D4ED8');

      doc.fill('#FFFFFF').fontSize(22).font('Helvetica-Bold')
        .text('BioSchedule', margin, 14);

      doc.fill('#BFDBFE').fontSize(10).font('Helvetica')
        .text(titulo, margin, 46);

      doc.fill('#BFDBFE').fontSize(8).font('Helvetica')
        .text(`Emitido em: ${this.formatarEmissao()}`, margin, 46, { align: 'right', width: contentW });

      doc.fill('#FFFFFF').fontSize(9).font('Helvetica-Bold')
        .text(`Período: ${this.formatarPeriodo(inicio, fim)}`, margin, 62, { align: 'right', width: contentW });

      // Posicionar cursor logo abaixo do header
      doc.y = 104;

      // -------------------------------------------------------
      // SEM DADOS
      // -------------------------------------------------------
      if (linhas.length === 0) {
        doc.moveDown(2)
          .fill('#EF4444').fontSize(12).font('Helvetica-Bold')
          .text('Nenhum dado encontrado para o período selecionado.', { align: 'center' });
        doc.end();
        return;
      }

      // -------------------------------------------------------
      // LARGURAS PROPORCIONAIS ao conteúdo total da página
      // -------------------------------------------------------
      const totalW = colunas.reduce((acc, c) => acc + c.width, 0);
      const columnsSize = colunas.map((c) => Math.floor((c.width / totalW) * contentW));
      // Compensar arredondamento na última coluna
      columnsSize[columnsSize.length - 1] += contentW - columnsSize.reduce((a, b) => a + b, 0);

      // -------------------------------------------------------
      // PREPARAR DADOS (sem linha de total — feita manualmente)
      // -------------------------------------------------------
      const dadosPdf = linhas.map((item) => {
        const row: Record<string, string> = {};
        colunas.forEach((col) => {
          row[col.key] = col.key === 'valor'
            ? (item.valorFormatado || `R$ ${Number(item.valor).toFixed(2).replace('.', ',')}`)
            : String(item[col.key] ?? '');
        });
        return row;
      });

      // Headers: usar propriedades documentadas da API pdfkit-table
      const tableHeaders = colunas.map((c, i) => ({
        label: c.header,
        property: c.key,
        width: columnsSize[i],
        headerColor: '#2563EB',    // fundo azul no header
        headerOpacity: 1,
        headerAlign: 'center',
      }));

      // -------------------------------------------------------
      // RENDERIZAR TABELA (retorna Promise)
      // -------------------------------------------------------
      (doc.table({ headers: tableHeaders, datas: dadosPdf }, {
        columnsSize,
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF'),
        prepareRow: () => doc.font('Helvetica').fontSize(9).fillColor('#334155'),
      }) as Promise<any>).then(() => {

        // -------------------------------------------------------
        // TOTAL FINANCEIRO — linha manual após a tabela
        // -------------------------------------------------------
        if (tipo === 'financeiro' && resumo) {
          doc.moveDown(0.5);

          // Separador
          const sepY = doc.y;
          doc.moveTo(margin, sepY).lineTo(margin + contentW, sepY)
            .strokeColor('#2563EB').lineWidth(1).stroke();
          doc.moveDown(0.4);

          // Rótulo à esquerda + valor à direita
          const totalY = doc.y;
          doc.fill('#1D4ED8').font('Helvetica-Bold').fontSize(10)
            .text('TOTAL FATURADO:', margin, totalY);
          doc.fill('#1D4ED8').font('Helvetica-Bold').fontSize(10)
            .text(resumo.totalFaturado, margin, totalY, { align: 'right', width: contentW });

          doc.moveDown(1.8);

          // -------------------------------------------------------
          // BOX RESUMO FINANCEIRO
          // -------------------------------------------------------
          const bY = doc.y;
          const bH = 55;

          // Fundo
          doc.rect(margin, bY, contentW, bH).fill('#EFF6FF');
          // Borda superior
          doc.moveTo(margin, bY).lineTo(margin + contentW, bY)
            .strokeColor('#93C5FD').lineWidth(1).stroke();

          // Título do box
          doc.fill('#1D4ED8').font('Helvetica-Bold').fontSize(8)
            .text('RESUMO DO PERÍODO', margin + 10, bY + 8);

          // Métricas na mesma linha
          const mY = bY + 24;
          const c3 = contentW / 3;

          doc.fill('#475569').font('Helvetica').fontSize(8)
            .text('Atendimentos: ', margin + 8, mY, { continued: true })
            .font('Helvetica-Bold').text(`${resumo.totalAtendimentos}`);

          doc.fill('#475569').font('Helvetica').fontSize(8)
            .text('Ticket Médio: ', margin + 8 + c3, mY, { continued: true })
            .font('Helvetica-Bold').text(`${resumo.ticketMedio}`);

          doc.fill('#475569').font('Helvetica').fontSize(8)
            .text('Top Serviço: ', margin + 8 + c3 * 2, mY, { continued: true })
            .font('Helvetica-Bold').text(`${resumo.topServico}`, { width: c3 - 12 });

          doc.y = bY + bH + 6;
        }

        // -------------------------------------------------------
        // BOX RESUMO AGENDA
        // -------------------------------------------------------
        if (tipo === 'agenda' && resumo) {
          doc.moveDown(1);
          const bY = doc.y;
          const bH = 34;

          doc.rect(margin, bY, contentW, bH).fill('#F8FAFC');
          doc.moveTo(margin, bY).lineTo(margin + contentW, bY)
            .strokeColor('#E2E8F0').lineWidth(1).stroke();

          const c4 = contentW / 4;
          const tY = bY + 11;

          doc.fill('#475569').font('Helvetica').fontSize(8)
            .text('Total: ', margin + 8, tY, { continued: true })
            .font('Helvetica-Bold').text(`${resumo.total}`);

          doc.fill('#475569').font('Helvetica').fontSize(8)
            .text('Concluídos: ', margin + 8 + c4, tY, { continued: true })
            .font('Helvetica-Bold').text(`${resumo.concluidos}`);

          doc.fill('#475569').font('Helvetica').fontSize(8)
            .text('Cancelados: ', margin + 8 + c4 * 2, tY, { continued: true })
            .font('Helvetica-Bold').text(`${resumo.cancelados}`);

          doc.fill('#475569').font('Helvetica').fontSize(8)
            .text('Faltaram: ', margin + 8 + c4 * 3, tY, { continued: true })
            .font('Helvetica-Bold').text(`${resumo.faltaram}`);

          doc.y = bY + bH + 6;
        }

        // -------------------------------------------------------
        // RODAPÉ
        // -------------------------------------------------------
        const rodapeY = doc.page.height - 26;
        doc.fill('#94A3B8').fontSize(7).font('Helvetica')
          .text(`BioSchedule — Relatório gerado em ${this.formatarEmissao()}`,
            margin, rodapeY, { align: 'center', width: contentW });

        doc.end();
      }).catch(reject);
    });
  }
}