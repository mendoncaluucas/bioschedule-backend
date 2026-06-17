const PDFDocument = require('pdfkit-table');
const fs = require('fs');

const doc = new PDFDocument({ margin: 40, size: 'A4' });
const writeStream = fs.createWriteStream('./test_relatorio.pdf');
doc.pipe(writeStream);

const pageW = doc.page.width;
const margin = 40;
const contentW = pageW - margin * 2;

// HEADER
doc.rect(0, 0, pageW, 88).fill('#1D4ED8');
doc.fill('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('BioSchedule', margin, 14);
doc.fill('#BFDBFE').fontSize(10).font('Helvetica').text('Relatório Financeiro — Faturamento', margin, 46);
doc.fill('#BFDBFE').fontSize(8).font('Helvetica').text('Emitido em: 17/06/2026', margin, 46, { align: 'right', width: contentW });
doc.fill('#FFFFFF').fontSize(9).font('Helvetica-Bold').text('Período: 01/06/2026 a 17/06/2026', margin, 62, { align: 'right', width: contentW });

doc.y = 104;

const colunas = [
  { header: 'Data', key: 'data', width: 12 },
  { header: 'Paciente', key: 'paciente', width: 26 },
  { header: 'Procedimento', key: 'procedimento', width: 22 },
  { header: 'Profissional', key: 'profissional', width: 20 },
  { header: 'Valor (R$)', key: 'valor', width: 14 },
];

const totalW = colunas.reduce((a, c) => a + c.width, 0);
const columnsSize = colunas.map(c => Math.floor((c.width / totalW) * contentW));
columnsSize[columnsSize.length - 1] += contentW - columnsSize.reduce((a, b) => a + b, 0);

const tableHeaders = colunas.map((c, i) => ({
  label: c.header,
  property: c.key,
  width: columnsSize[i],
  headerColor: '#2563EB',
  headerOpacity: 1,
  headerAlign: 'center',
}));

const dadosPdf = [
  { data: '11/06/2026', paciente: 'Lucas Mendonça', procedimento: 'Limpeza de Pele', profissional: 'Juciane Oliveira', valor: 'R$ 120,00' },
  { data: '11/06/2026', paciente: 'Maria Silva', procedimento: 'Preenchimento Labial', profissional: 'Lucas Mendonça', valor: 'R$ 500,00' },
  { data: '12/06/2026', paciente: 'Lucas Mendonça', procedimento: 'Botox', profissional: 'Lucas Mendonça', valor: 'R$ 1.000,00' },
];

doc.table({ headers: tableHeaders, datas: dadosPdf }, {
  columnsSize,
  prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF'),
  prepareRow: () => doc.font('Helvetica').fontSize(9).fillColor('#334155'),
}).then(() => {
  // TOTAL
  doc.moveDown(0.5);
  const sepY = doc.y;
  doc.moveTo(margin, sepY).lineTo(margin + contentW, sepY).strokeColor('#2563EB').lineWidth(1).stroke();
  doc.moveDown(0.4);
  
  const totalY = doc.y;
  doc.fill('#1D4ED8').font('Helvetica-Bold').fontSize(10).text('TOTAL FATURADO:', margin, totalY);
  doc.fill('#1D4ED8').font('Helvetica-Bold').fontSize(10).text('R$ 1.620,00', margin, totalY, { align: 'right', width: contentW });

  doc.moveDown(1.8);

  // RESUMO BOX
  const bY = doc.y;
  const bH = 55;
  doc.rect(margin, bY, contentW, bH).fill('#EFF6FF');
  doc.moveTo(margin, bY).lineTo(margin + contentW, bY).strokeColor('#93C5FD').lineWidth(1).stroke();

  doc.fill('#1D4ED8').font('Helvetica-Bold').fontSize(8).text('RESUMO DO PERÍODO', margin + 10, bY + 9, { width: contentW - 20 });

  const mY = bY + 24;
  const c3 = contentW / 3;
  doc.fill('#475569').font('Helvetica').fontSize(8).text('Atendimentos: ', margin + 8, mY, { continued: true }).font('Helvetica-Bold').text('3');
  doc.fill('#475569').font('Helvetica').fontSize(8).text('Ticket Médio: ', margin + 8 + c3, mY, { continued: true }).font('Helvetica-Bold').text('R$ 540,00');
  doc.fill('#475569').font('Helvetica').fontSize(8).text('Top Serviço: ', margin + 8 + c3 * 2, mY, { continued: true }).font('Helvetica-Bold').text('Botox (1x)', { width: c3 - 12 });

  // RODAPÉ
  const rodapeY = doc.page.height - 26;
  doc.fill('#94A3B8').fontSize(7).font('Helvetica').text('BioSchedule — Relatório gerado em 17/06/2026', margin, rodapeY, { align: 'center', width: contentW });

  doc.end();
  console.log('PDF gerado com sucesso!');
}).catch(err => {
  console.error('ERRO ao gerar PDF:', err);
  doc.end();
});
