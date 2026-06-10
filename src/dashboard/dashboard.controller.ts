import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';

@ApiTags('Dashboard (Painel Inicial)')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumo-periodo')
  @ApiOperation({
    summary:
      'Retorna métricas financeiras completas, comparativo e ranking de serviços para um período',
  })
  @ApiQuery({
    name: 'inicio',
    example: '2026-06-01',
    description: 'Data início do período (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fim',
    example: '2026-06-10',
    description: 'Data fim do período (YYYY-MM-DD)',
  })
  getResumoPeriodo(
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
  ) {
    return this.dashboardService.getResumoPeriodo(inicio, fim);
  }
}