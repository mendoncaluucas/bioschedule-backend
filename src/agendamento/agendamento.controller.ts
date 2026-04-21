import { Controller, Get, Post, Body, Param, Delete, Patch, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { AgendamentoService } from './agendamento.service';

@Controller('agendamento')
export class AgendamentoController {
  constructor(private readonly agendamentoService: AgendamentoService) {}

  // ==========================================
  // ✨ ROTAS PÚBLICAS (Para o cliente no site)
  // ==========================================
  
  @Get('publico/horarios-disponiveis')
  async buscarHorarios(
    @Query('data') data: string,
    @Query('profissionalId') profissionalId: string,
  ) {
    return this.agendamentoService.listarHorariosDisponiveis(data, profissionalId);
  }

  // ✨ NOVA ROTA: Busca dados básicos do paciente pelo CPF para auto-preenchimento
  @Get('publico/paciente/:cpf')
  async buscarPacientePorCpf(@Param('cpf') cpf: string) {
    return this.agendamentoService.buscarPacientePorCpf(cpf);
  }

  @Post('publico')
  async criarAgendamentoPublico(@Body() dados: any) {
    return this.agendamentoService.agendarPublico(dados);
  }

  // ==========================================
  // 🔒 ROTAS PRIVADAS (Para o Painel da Clínica)
  // ==========================================

  @Post()
  create(@Body() createAgendamentoDto: any) {
    return this.agendamentoService.create(createAgendamentoDto);
  }

  @Get()
  findAll() {
    return this.agendamentoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agendamentoService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAgendamentoDto: any) {
    return this.agendamentoService.update(id, updateAgendamentoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.agendamentoService.remove(id);
  }
}