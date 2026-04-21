import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ServicoService } from './servico.service';
import { CreateServicoDto } from './dto/create-servico.dto';
import { UpdateServicoDto } from './dto/update-servico.dto';

@Controller('servicos') // ✨ Pluralizado para evitar Erro 404
export class ServicoController {
  constructor(private readonly servicoService: ServicoService) {}

  // ✨ ROTA PÚBLICA (Livre de autenticação para o cliente agendar)
  @Get('publico')
  findAllPublico() {
    return this.servicoService.findAll();
  }

  // 🔒 ROTAS PRIVADAS (Com o AuthGuard protegendo individualmente)
  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createServicoDto: CreateServicoDto) {
    return this.servicoService.create(createServicoDto);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.servicoService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicoService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateServicoDto: UpdateServicoDto) {
    return this.servicoService.update(id, updateServicoDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.servicoService.remove(id);
  }
}