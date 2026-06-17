import { Controller, Get, Query, Res, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RelatoriosService } from './relatorios.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  /**
   * Retorna a contagem de registros para o período selecionado.
   * Usado pelo frontend para exibir preview antes do download.
   */
  @Get('preview')
  @ApiOperation({ summary: 'Retorna contagem de registros para o período' })
  async preview(
    @Query('tipo') tipo: string,
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
  ) {
    if (!tipo || !inicio || !fim) {
      throw new BadRequestException('Parâmetros incompletos.');
    }
    return this.relatoriosService.preview(tipo, inicio, fim);
  }

  @Get('exportar')
  @ApiOperation({ summary: 'Exporta relatório em PDF ou Excel' })
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
          'Content-Disposition': `attachment; filename=BioSchedule_${tipo}_${inicio}.xlsx`,
        });
        res.send(buffer);
      } else if (formato === 'pdf') {
        const buffer = await this.relatoriosService.exportarPdf(tipo, inicio, fim);
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=BioSchedule_${tipo}_${inicio}.pdf`,
        });
        res.send(buffer);
      } else {
        throw new BadRequestException('Formato inválido. Use "pdf" ou "excel".');
      }
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ message: 'Erro ao gerar o relatório.', detail: error?.message });
      }
    }
  }
}