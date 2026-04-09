import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit-table';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  private async getDadosDoRelatorio(tipo: string, inicio: string, fim: string) {
    let colunas: Array<{ header: string; key: string; width: number }> = [];
    let linhas: any[] = [];
    let titulo = '';

    const dataInicio = new Date(`${inicio}T00:00:00.000Z`);
    const dataFim = new Date(`${fim}T23:59:59.999Z`);

    if (tipo === 'financeiro') {
      titulo = 'Relatório Financeiro (Faturamento)';
      colunas = [
        { header: 'Data', key: 'data', width: 15 },
        { header: 'Paciente', key: 'paciente', width: 30 },
        { header: 'Procedimento', key: 'procedimento', width: 25 },
        { header: 'Valor (R$)', key: 'valor', width: 15 }
      ];

      const agendamentos = await this.prisma.agendamento.findMany({
        where: {
          data_inicio: { gte: dataInicio, lte: dataFim },
          status: 'CONCLUIDO',
        },
        include: { paciente: true, servico: true },
        orderBy: { data_inicio: 'asc' }
      });

      linhas = agendamentos.map(ag => ({
        data: ag.data_inicio.toLocaleDateString('pt-BR'),
        paciente: ag.paciente.nome,
        procedimento: ag.servico.nome,
        valor: `R$ ${Number(ag.servico.valor).toFixed(2)}`
      }));

      const total = agendamentos.reduce((acc, ag) => acc + Number(ag.servico.valor), 0);
      if (linhas.length > 0) {
        linhas.push({ data: '', paciente: '', procedimento: 'TOTAL:', valor: `R$ ${total.toFixed(2)}` });
      }
    } 
    else if (tipo === 'agenda') {
      titulo = 'Relatório de Agenda';
      colunas = [
        { header: 'Data', key: 'data', width: 12 },
        { header: 'Hora', key: 'hora', width: 8 },
        { header: 'Paciente', key: 'paciente', width: 25 },
        { header: 'Procedimento', key: 'procedimento', width: 20 },
        { header: 'Status', key: 'status', width: 15 }
      ];

      const agendamentos = await this.prisma.agendamento.findMany({
        where: { data_inicio: { gte: dataInicio, lte: dataFim } },
        include: { paciente: true, servico: true },
        orderBy: { data_inicio: 'asc' }
      });

      linhas = agendamentos.map(ag => ({
        data: ag.data_inicio.toLocaleDateString('pt-BR'),
        hora: ag.data_inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        paciente: ag.paciente.nome,
        procedimento: ag.servico.nome,
        status: ag.status
      }));
    } 
    else if (tipo === 'pacientes') {
      titulo = 'Relatório de Clientes Cadastrados';
      colunas = [
        { header: 'Nome', key: 'nome', width: 30 },
        { header: 'CPF', key: 'cpf', width: 18 },
        { header: 'Telefone', key: 'telefone', width: 18 },
        { header: 'E-mail', key: 'email', width: 25 },
        { header: 'Cadastro', key: 'cadastro', width: 15 }
      ];

      const pacientes = await this.prisma.paciente.findMany({
        where: { createdAt: { gte: dataInicio, lte: dataFim } },
        orderBy: { nome: 'asc' }
      });

      linhas = pacientes.map(p => ({
        nome: p.nome,
        cpf: p.cpf,
        telefone: p.telefone,
        email: p.email || '-',
        cadastro: p.createdAt.toLocaleDateString('pt-BR')
      }));
    }

    return { titulo, colunas, linhas };
  }

  async exportarExcel(tipo: string, inicio: string, fim: string): Promise<Buffer> {
    const { colunas, linhas } = await this.getDadosDoRelatorio(tipo, inicio, fim);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório');

    worksheet.columns = colunas;
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

    linhas.forEach(item => worksheet.addRow(item));
    
    // ✨ Correção para o erro de Buffer ts(2352)
    const result = await workbook.xlsx.writeBuffer();
    return Buffer.from(result); 
  }

  async exportarPdf(tipo: string, inicio: string, fim: string): Promise<Buffer> {
    const { titulo, colunas, linhas } = await this.getDadosDoRelatorio(tipo, inicio, fim);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers: any[] = []; // ✨ Alterado para any para evitar conflitos de tipo Buffer

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // (Logotipo e Título igual ao anterior...)
      doc.fontSize(22).fillColor('#2563EB').text('BioSchedule', { align: 'center' });
      doc.moveDown();

      const tableHeaders = colunas.map(c => ({
        label: c.header,
        property: c.key,
        width: c.width * 5 
      }));

      const tabela = {
        headers: tableHeaders,
        datas: linhas
      };

      if (linhas.length === 0) {
        doc.fontSize(12).fillColor('#EF4444').text('Nenhum dado encontrado.', { align: 'center' });
      } else {
        doc.table(tabela, {
          prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9),
          prepareRow: () => doc.font("Helvetica").fontSize(9).fillColor('#334155'),
        });
      }

      doc.end();
    });
  }
}