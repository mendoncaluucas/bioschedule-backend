import { Controller, Post, Body, Get, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Controller('usuarios') // ✨ Alterado para plural para combinar com o Front-end
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  // ✨ NOVO: Lista todos os profissionais para a tela de Equipe
  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }

  // ✨ NOVO: Remove um profissional da clínica
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usuarioService.remove(id);
  }
}