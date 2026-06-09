import { Controller, Get, Query, Res, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RelatoriosService } from './relatorios.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('exportar')
  async exportar(
    @Query('tipo') tipo: string,
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
    @Query('formato') formato: string,
    @Res() res: Response,
  ) {
    if (!tipo || !inicio || !fim || !formato) {
      throw new BadRequestException('Parâmetros incompletos.');
    }

    try {
      if (formato === 'excel') {
        const buffer = await this.relatoriosService.exportarExcel(tipo, inicio, fim);
        res.set({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=relatorio_${tipo}.xlsx`,
        });
        res.send(buffer);
      } 
      else if (formato === 'pdf') {
        const buffer = await this.relatoriosService.exportarPdf(tipo, inicio, fim);
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=relatorio_${tipo}.pdf`,
        });
        res.send(buffer);
      } 
      else {
        throw new BadRequestException('Formato inválido.');
      }
    } catch (error) {
      res.status(500).json({ message: 'Erro ao gerar o relatório.' });
    }
  }
}