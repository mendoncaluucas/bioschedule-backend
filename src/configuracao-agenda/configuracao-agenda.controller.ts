import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfiguracaoAgendaService } from './configuracao-agenda.service';
import { CreateConfiguracaoAgendaDto } from './dto/create-configuracao-agenda.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Configuração de Agenda')
@Controller('configuracao-agenda')
export class ConfiguracaoAgendaController {
  constructor(private readonly configuracaoAgendaService: ConfiguracaoAgendaService) {}

  // ==========================================
  // ✨ ROTA PÚBLICA (Para o frontend de agendamento)
  // ==========================================

  @Get('publico')
  buscarConfiguracoesPublicas() {
    return this.configuracaoAgendaService.buscarTodas();
  }

  // ==========================================
  // 🔒 ROTAS PRIVADAS (Painel Administrativo)
  // ==========================================

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post()
  salvarConfiguracoes(@Body() createDto: CreateConfiguracaoAgendaDto) {
    // O React vai enviar o objeto { horarios: [...] }
    return this.configuracaoAgendaService.salvar(createDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get()
  buscarConfiguracoes() {
    // Retorna os horários salvos para preencher a tela no React
    return this.configuracaoAgendaService.buscarTodas();
  }
}