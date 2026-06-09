import { Controller, Get, Post, Body, Param, Delete, Patch, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AgendamentoService } from './agendamento.service';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';
import { UpdateAgendamentoDto } from './dto/update-agendamento.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Agendamentos')
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

  // ✨ Busca dados básicos do paciente pelo CPF para auto-preenchimento
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

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post()
  create(@Body() createAgendamentoDto: CreateAgendamentoDto) {
    return this.agendamentoService.create(createAgendamentoDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get()
  findAll() {
    return this.agendamentoService.findAll();
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agendamentoService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAgendamentoDto: UpdateAgendamentoDto) {
    return this.agendamentoService.update(id, updateAgendamentoDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.agendamentoService.remove(id);
  }
}