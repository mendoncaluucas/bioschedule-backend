import { Controller, Post, Body, Get, Delete, Param, Patch, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  // ✨ ROTA PÚBLICA (Para listar profissionais no site)
  @Get('publico/equipe')
  findEquipePublica() {
    return this.usuarioService.findEquipePublica();
  }

  // 🔒 ROTAS PRIVADAS (Exigem Login)

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }

  // ✨ ADICIONADO: Rota para aprovar/atualizar usuário
  // Resolve o erro 404 ao tentar aprovar
  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.usuarioService.update(id, updateData);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usuarioService.remove(id);
  }
}