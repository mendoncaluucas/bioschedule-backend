import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BloqueioService } from './bloqueio.service';
import { CreateBloqueioDto } from './dto/create-bloqueio.dto';
import { UpdateBloqueioDto } from './dto/update-bloqueio.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Bloqueios de Agenda')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('bloqueio')
export class BloqueioController {
  constructor(private readonly bloqueioService: BloqueioService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um novo bloqueio na agenda (Ex: Almoço, Imprevisto)' })
  create(@Body() createBloqueioDto: CreateBloqueioDto) {
    return this.bloqueioService.create(createBloqueioDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todos os bloqueios' })
  findAll() {
    return this.bloqueioService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca os detalhes de um bloqueio específico' })
  findOne(@Param('id') id: string) { // <-- Sem o '+'
    return this.bloqueioService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um bloqueio' })
  update(@Param('id') id: string, @Body() updateBloqueioDto: UpdateBloqueioDto) { // <-- Sem o '+'
    return this.bloqueioService.update(id, updateBloqueioDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um bloqueio (Libera o horário na agenda)' })
  remove(@Param('id') id: string) { // <-- Sem o '+'
    return this.bloqueioService.remove(id);
  }
}